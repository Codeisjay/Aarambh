// useConfidenceScore.js
// Connects to Devesh's CV Module for real-time facial confidence assessment
import { useState, useEffect, useRef } from 'react';
import { metricsAPI } from '../services/endpoints';

const CV_MODULE_URL = import.meta.env.VITE_CV_MODULE_URL || 'http://localhost:5001';

export function useConfidenceScore(sessionId = null) {
  const [metrics, setMetrics] = useState({
    confidence_score: 0,
    eye_contact_score: 0,
    blink_score: 0,
    head_stability_score: 0,
    face_detected: false,
    warnings: []
  });

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const lastPersistedAt = useRef(0);

  const normalizeMetrics = (payload) => {
    const data = payload?.data ?? payload ?? {};
    const confidence = data.confidence ?? {};

    const toScore = (value) => {
      const score = Number(value);
      return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    };

    const overallConfidence = toScore(
      data.confidence_score ??
      confidence.confidence_score ??
      confidence.score ??
      data.overallConfidence ??
      confidence.overallConfidence ?? 0
    );

    const eyeContactScore = toScore(
      data.eye_contact?.eye_contact_score ??
      data.eye_contact_score ??
      confidence.eye_contact_score ??
      data.eye_contact?.score ??
      0
    );

    const blinkScore = toScore(
      data.blink?.blink_score ??
      data.blink_score ??
      confidence.blink_score ??
      data.blink?.score ??
      0
    );

    const headStabilityScore = toScore(
      data.head_pose?.head_stability_score ??
      data.head_stability_score ??
      confidence.head_stability_score ??
      data.head_pose?.score ??
      0
    );

    const warnings = Array.isArray(data.warnings)
      ? data.warnings
      : Array.isArray(confidence.warnings)
        ? confidence.warnings
        : [];

    const faceDetected = Boolean(
      data.face?.detected ??
      data.face_detected ??
      confidence.face_detected ??
      data.face?.confidence ??
      false
    );

    return {
      confidence_score: overallConfidence,
      eye_contact_score: eyeContactScore,
      blink_score: blinkScore,
      head_stability_score: headStabilityScore,
      face_detected: faceDetected,
      warnings,
      raw: { ...data, confidence }
    };
  };

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const applyPayload = (payload) => {
      if (!payload || typeof payload !== 'object') return false;

      const normalized = normalizeMetrics(payload);
      const isValid = Boolean(payload.success !== false) && (
        payload.success === true ||
        payload.confidence ||
        payload.eye_contact ||
        payload.blink ||
        payload.head_pose ||
        payload.confidence_score ||
        payload.eye_contact_score ||
        payload.head_stability_score
      );

      if (!isValid) {
        if (payload.success === false) {
          setMetrics((previous) => ({
            ...previous,
            confidence_score: 0,
            eye_contact_score: 0,
            blink_score: 0,
            head_stability_score: 0,
            face_detected: false,
            warnings: [payload.message || 'No face detected. Center your face in the camera.'],
          }));
        }
        return false;
      }

      setMetrics({
        confidence_score: normalized.confidence_score,
        eye_contact_score: normalized.eye_contact_score,
        blink_score: normalized.blink_score,
        head_stability_score: normalized.head_stability_score,
        face_detected: normalized.face_detected,
        warnings: normalized.warnings,
      });

      setIsConnected(true);
      setConnectionError(null);

      const now = Date.now();
      if (sessionId && now - lastPersistedAt.current >= 5000) {
        lastPersistedAt.current = now;
        metricsAPI.updateConfidenceMetrics(sessionId, {
          eyeContact: normalized.eye_contact_score,
          blinking: Number(payload.blink?.blink_rate || 0),
          posture: normalized.head_stability_score,
          engagement: normalized.eye_contact_score,
          nervousness: Math.max(0, 100 - normalized.blink_score),
          overallConfidenceScore: normalized.confidence_score,
          recommendations: normalized.warnings,
        }).catch((error) => {
          console.warn('[CV Module] Could not persist metrics:', error.message);
        });
      }

      return true;
    };

    const pollCurrentMetrics = async () => {
      try {
        const response = await fetch(`${CV_MODULE_URL}/api/metrics/current`);
        if (!response.ok) return;
        const payload = await response.json();
        applyPayload(payload);
      } catch (error) {
        console.warn('[CV Module] Poll fallback failed:', error.message);
      }
    };

    const connect = () => {
      try {
        console.log(`[CV Module] Attempting connection to ${CV_MODULE_URL}/api/metrics/stream`);
        eventSource = new EventSource(`${CV_MODULE_URL}/api/metrics/stream`);

        eventSource.onopen = () => {
          console.log('[CV Module] ✓ Connected successfully');
          setIsConnected(true);
          setConnectionError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            applyPayload(data);
          } catch (error) {
            console.error('[CV Module] Error parsing metrics:', error);
          }
        };

        eventSource.onerror = () => {
          console.warn('[CV Module] Connection error, will retry in 3 seconds');
          setIsConnected(false);
          setConnectionError('CV Module disconnected. Retrying...');

          if (eventSource) {
            eventSource.close();
          }

          reconnectTimeout = setTimeout(() => {
            pollCurrentMetrics();
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('[CV Module] Failed to initialize connection:', error);
        setConnectionError(error.message);
        setIsConnected(false);

        reconnectTimeout = setTimeout(() => {
          pollCurrentMetrics();
          connect();
        }, 3000);
      }
    };

    connect();
    pollCurrentMetrics();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [sessionId]);

  return {
    eyeContact: metrics.eye_contact_score,
    blinkScore: metrics.blink_score,
    headStability: metrics.head_stability_score,
    overallConfidence: metrics.confidence_score,
    faceDetected: metrics.face_detected,
    isConnected,
    connectionError,
    warnings: metrics.warnings
  };
}
