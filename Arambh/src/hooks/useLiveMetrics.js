import { useEffect, useMemo, useState } from 'react';
import { useSocketInterview } from './useSocketInterview';

export function useLiveMetrics(sessionId, initialValues = {}) {
  const socket = useSocketInterview(sessionId);
  const [liveMetrics, setLiveMetrics] = useState({
    wpm: initialValues.wpm ?? 0,
    fillerWords: initialValues.fillerWords ?? 0,
    clarity: initialValues.clarity ?? 0,
    eyeContact: initialValues.eyeContact ?? 0,
    blinkScore: initialValues.blinkScore ?? 0,
    headStability: initialValues.headStability ?? 0,
    overallConfidence: initialValues.overallConfidence ?? 0,
    warnings: initialValues.warnings ?? [],
    feedback: initialValues.feedback ?? [],
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (!socket) return undefined;

    const handleMetrics = (payload) => {
      setLiveMetrics((prev) => ({
        ...prev,
        ...payload,
        warnings: payload.warnings || payload.feedback?.map((item) => item.text) || prev.warnings,
        feedback: payload.feedback || prev.feedback,
      }));
    };

    const handleFeedback = (payload) => {
      const feedback = Array.isArray(payload) ? payload : [payload];
      setLiveMetrics((prev) => ({
        ...prev,
        feedback,
        warnings: feedback.filter((item) => item?.type !== 'success').map((item) => item.text),
      }));
    };

    const handleConfidence = (payload) => {
      setLiveMetrics((prev) => ({
        ...prev,
        overallConfidence: payload.overallConfidence ?? prev.overallConfidence,
        communicationScore: payload.communicationScore,
        behaviorScore: payload.behaviorScore,
        feedback: payload.feedback || prev.feedback,
      }));
    };

    socket.on('live-metrics', handleMetrics);
    socket.on('live-feedback', handleFeedback);
    socket.on('confidence-update', handleConfidence);

    return () => {
      socket.off('live-metrics', handleMetrics);
      socket.off('live-feedback', handleFeedback);
      socket.off('confidence-update', handleConfidence);
    };
  }, [socket]);

  const derived = useMemo(() => ({
    wpm: liveMetrics.wpm ?? 0,
    fillerWords: liveMetrics.fillerWords ?? 0,
    clarity: liveMetrics.clarity ?? 0,
    eyeContact: liveMetrics.eyeContact ?? 0,
    blinkScore: liveMetrics.blinkScore ?? 0,
    headStability: liveMetrics.headStability ?? 0,
    overallConfidence: liveMetrics.overallConfidence ?? 0,
    warnings: Array.isArray(liveMetrics.warnings) ? liveMetrics.warnings : [],
    feedback: Array.isArray(liveMetrics.feedback) ? liveMetrics.feedback : [],
  }), [liveMetrics]);

  return derived;
}
