const { buildSessionAudit, deduplicateFindings } = require('../controllers/reportController');

describe('report audit persistence helpers', () => {
  test('counts persisted insight and timeline observations', () => {
    const audit = buildSessionAudit(
      { insights: [{ timestamp: 1, metric: 'session-completion', value: 82, feedback: 'Speech snapshot' }] },
      {
        insights: [{ timestamp: 2, metric: 'confidence-snapshot', value: 74, feedback: 'Confidence snapshot' }],
        metricsByTimestamp: [{ timestamp: 2, eyeContact: 80, posture: 75, engagement: 80 }],
      },
    );

    expect(audit.totalSnapshots).toBe(2);
    expect(audit.observations).toHaveLength(2);
  });

  test('deduplicates equivalent strengths by metric category and keeps the most descriptive wording', () => {
    expect(deduplicateFindings([
      'Clear speech delivery',
      'Clear and structured speech delivery',
      'Excellent eye contact',
      'Professional eye contact',
    ])).toEqual([
      'Clear and structured speech delivery',
      'Professional eye contact',
    ]);
  });

  test('collapses repeated session completion snapshots from retried completion requests', () => {
    const audit = buildSessionAudit({
      insights: [
        { timestamp: 1, metric: 'session-completion', value: 71, feedback: 'Completed session speech snapshot: 7 WPM, 0 fillers' },
        { timestamp: 2, metric: 'session-completion', value: 71, feedback: 'Completed session speech snapshot: 7 WPM, 0 fillers' },
      ],
    }, {});

    expect(audit.totalSnapshots).toBe(1);
  });
});