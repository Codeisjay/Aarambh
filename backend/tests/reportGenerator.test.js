const { generateInterviewReport } = require('../services/reportGenerator');

describe('reportGenerator', () => {
  test('builds a structured candidate report with AI-driven summary and recommendations', () => {
    const report = generateInterviewReport({
      session: { title: 'System Design Round', description: 'Architecture discussion' },
      speechMetrics: {
        pace: 128,
        clarity: 76,
        fillers: 3,
        averagePauseDuration: 2.4,
        completeness: 84,
        relevance: 88,
      },
      confidenceMetrics: {
        eyeContact: 82,
        posture: 79,
        nervousness: 21,
        overallConfidenceScore: 81,
      },
      transcript: 'I structured the solution around microservices and clear APIs.',
      question: 'How would you design a scalable system?',
    });

    expect(report).toMatchObject({
      overallScore: expect.any(Number),
      summary: expect.any(String),
      strengths: expect.any(Array),
      recommendations: expect.any(Array),
      aiPipeline: expect.objectContaining({
        whisper: expect.any(String),
        sentenceBert: expect.any(String),
        coachingModel: expect.any(String),
      }),
    });
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });
});
