const { evaluateInterviewSnapshot, calculateOverallConfidence } = require('../services/decisionEngine');

describe('decisionEngine', () => {
  test('calculates overall confidence using the configured scoring formula', () => {
    const result = evaluateInterviewSnapshot({
      eyeContact: 82,
      blinkRate: 18,
      headStability: 91,
      clarity: 88,
      fillerWords: 4,
      wpm: 120,
      pauseDuration: 2,
    });

    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(100);
    expect(result.communicationScore).toBeGreaterThanOrEqual(0);
    expect(result.behaviorScore).toBeGreaterThanOrEqual(0);
    expect(result.feedback).toEqual(expect.any(Array));
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  test('reduces confidence when filler usage is high', () => {
    const result = calculateOverallConfidence({
      eyeContact: 60,
      blinkRate: 30,
      headStability: 68,
      clarity: 72,
      fillerPenalty: 12,
      wpm: 135,
      pauseDuration: 3,
    });

    expect(result.overallConfidence).toBeLessThan(75);
  });
});
