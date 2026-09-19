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

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;
    
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
            const payload = data.data || data;
            if (payload.success && payload.confidence) {
              const confidence = payload.confidence;
              const toScore = (value) => {
                const score = Number(value);
                return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
              };
              const confidenceScore = toScore(confidence.confidence_score);
              const eyeContactScore = toScore(confidence.eye_contact_score);
              const blinkScore = toScore(confidence.blink_score ?? payload.blink?.blink_score);
              const headStabilityScore = toScore(confidence.head_stability_score);

              setMetrics({
                confidence_score: confidenceScore,
                eye_contact_score: eyeContactScore,
                blink_score: blinkScore,
                head_stability_score: headStabilityScore,
                face_detected: payload.face?.detected === true,
                warnings: confidence.warnings || []
              });

              const now = Date.now();
              if (sessionId && now - lastPersistedAt.current >= 5000) {
                lastPersistedAt.current = now;
                metricsAPI.updateConfidenceMetrics(sessionId, {
                  eyeContact: eyeContactScore,
                  blinking: payload.blink?.blink_rate || 0,
                  posture: headStabilityScore,
                  engagement: eyeContactScore,
                  nervousness: 100 - blinkScore,
                  overallConfidenceScore: confidenceScore,
                  recommendations: confidence.warnings || [],
                }).catch((error) => {
                  console.warn('[CV Module] Could not persist metrics:', error.message);
                });
              }
            } else if (payload.success === false) {
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
          
          // Retry connection after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (error) {
        console.error('[CV Module] Failed to initialize connection:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        // Retry after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };
    
    connect();
    
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
