const DEFAULT_THRESHOLDS = {
  eyeContact: 75,
  fillerThreshold: 5,
  wpmThreshold: 90,
  pauseThreshold: 3,
  blinkThreshold: 25,
};

const clamp = (value, min = 0, max = 100) => {
  const numeric = Number(value) || 0;
  return Math.min(max, Math.max(min, numeric));
};

const round = (value) => Math.round(Number(value || 0));

const scoreFromRange = (value, idealMin, idealMax) => {
  const safeValue = clamp(value);
  if (safeValue >= idealMin && safeValue <= idealMax) return 100;
  if (safeValue > idealMax) return clamp(100 - (safeValue - idealMax) * 1.4);
  return clamp((safeValue / idealMin) * 100);
};

const buildFeedback = ({ eyeContact, blinkRate, headStability, clarity, fillerWords, wpm, pauseDuration }) => {
  const feedback = [];

  if (eyeContact >= 75) {
    feedback.push({ type: 'success', text: 'Strong eye contact with the interviewer.' });
  } else if (eyeContact >= 55) {
    feedback.push({ type: 'warn', text: 'Maintain stronger eye contact with the interviewer.' });
  } else {
    feedback.push({ type: 'warn', text: 'Maintain eye contact with the interviewer.' });
  }

  if (blinkRate > 25) {
    feedback.push({ type: 'warn', text: 'Blink rate is elevated. Try to stay calmer and more composed.' });
  } else if (blinkRate < 10) {
    feedback.push({ type: 'info', text: 'Blink rate is low. Keep a natural, relaxed gaze.' });
  }

  if (headStability < 80) {
    feedback.push({ type: 'warn', text: 'Keep your head steady while answering.' });
  }

  if (pauseDuration > 6) {
    feedback.push({ type: 'warn', text: 'Try not to stay silent for too long.' });
  } else if (pauseDuration > 3) {
    feedback.push({ type: 'info', text: 'Continue your answer to reduce pauses.' });
  }

  if (fillerWords > 5) {
    feedback.push({ type: 'warn', text: 'Reduce filler words to sound more confident.' });
  } else if (fillerWords <= 2) {
    feedback.push({ type: 'success', text: 'Your speech is concise and confident.' });
  }

  if (wpm < 90) {
    feedback.push({ type: 'info', text: 'Speak slightly faster to keep momentum.' });
  } else if (wpm > 170) {
    feedback.push({ type: 'warn', text: 'Slow down your speaking pace.' });
  } else {
    feedback.push({ type: 'success', text: 'Speaking pace is within a healthy range.' });
  }

  if (clarity >= 80) {
    feedback.push({ type: 'success', text: 'Excellent speech clarity.' });
  } else if (clarity < 60) {
    feedback.push({ type: 'warn', text: 'Focus on clearer articulation and pacing.' });
  }

  return feedback.slice(0, 5);
};

function calculateOverallConfidence(snapshot = {}, thresholds = DEFAULT_THRESHOLDS) {
  const eyeContact = clamp(snapshot.eyeContact ?? snapshot.eye_contact ?? 0);
  const blinkRate = clamp(snapshot.blinkRate ?? snapshot.blink ?? 0, 0, 60);
  const headStability = clamp(snapshot.headStability ?? snapshot.head_stability ?? 0);
  const clarity = clamp(snapshot.clarity ?? 0);
  const fillerPenalty = clamp(snapshot.fillerPenalty ?? snapshot.fillerWords ?? snapshot.fillers ?? 0, 0, 20);
  const wpm = clamp(snapshot.wpm ?? 0, 0, 220);
  const pauseDuration = clamp(snapshot.pauseDuration ?? snapshot.pause ?? 0, 0, 30);

  const blinkScore = clamp(100 - Math.max(0, blinkRate - thresholds.blinkThreshold) * 4);
  const headScore = clamp(headStability);
  const eyeScore = clamp(eyeContact);
  const clarityScore = clamp(clarity);
  const paceScore = wpm < 90 ? clamp((wpm / 90) * 100) : wpm > 170 ? clamp(100 - (wpm - 170) * 2) : 100;
  const fillerScore = clamp(100 - fillerPenalty * 10);
  const pauseScore = clamp(100 - pauseDuration * 8);

  const behaviorScore = round(eyeScore * 0.35 + blinkScore * 0.2 + headScore * 0.2 + pauseScore * 0.15 + fillerScore * 0.1);
  const communicationScore = round(clarityScore * 0.55 + paceScore * 0.25 + fillerScore * 0.15 + pauseScore * 0.05);
  const overallConfidence = round(behaviorScore * 0.55 + communicationScore * 0.45);

  const feedback = buildFeedback({
    eyeContact: eyeScore,
    blinkRate,
    headStability: headScore,
    clarity: clarityScore,
    fillerWords: fillerPenalty,
    wpm,
    pauseDuration,
  });

  return {
    overallConfidence,
    behaviorScore,
    communicationScore,
    feedback,
  };
}

function evaluateInterviewSnapshot(snapshot = {}, thresholds = DEFAULT_THRESHOLDS) {
  const derived = calculateOverallConfidence(snapshot, thresholds);

  const eyeContact = clamp(snapshot.eyeContact ?? snapshot.eye_contact ?? 0);
  const fillerWords = clamp(snapshot.fillerPenalty ?? snapshot.fillerWords ?? snapshot.fillers ?? 0, 0, 20);
  const headStability = clamp(snapshot.headStability ?? snapshot.head_stability ?? 0);

  return {
    ...derived,
    eyeContact,
    headStability,
    fillerWords,
    threshold: thresholds,
    status: derived.overallConfidence >= 75 ? 'good' : derived.overallConfidence >= 55 ? 'average' : 'warning',
  };
}

module.exports = {
  DEFAULT_THRESHOLDS,
  calculateOverallConfidence,
  evaluateInterviewSnapshot,
  buildFeedback,
};
