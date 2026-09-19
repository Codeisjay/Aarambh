const Report = require('../models/Report');
const Session = require('../models/Session');
const SpeechMetrics = require('../models/SpeechMetrics');
const ConfidenceMetrics = require('../models/ConfidenceMetrics');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const InterviewQuestion = require('../models/InterviewQuestion');
const { generateInterviewReport, analyzeWithPythonService } = require('../services/reportGenerator');

// @desc    Generate report for a session
// @route   POST /api/reports/generate/:sessionId
// @access  Private
exports.generateReport = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate('speechMetricsId')
      .populate('confidenceMetricsId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate report for this session',
      });
    }

    const speechMetrics = session.speechMetricsId || {};
    const confidenceMetrics = session.confidenceMetricsId || {};

    const speechScore = speechMetrics.overallScore || 0;
    const confidenceScore = confidenceMetrics.overallConfidenceScore || 0;
    const contentScore = speechMetrics.completeness || 0;
    const overallScore = (speechScore + confidenceScore + contentScore) / 3;

    const questionRecord = session.questions?.[0]?.questionId
      ? await InterviewQuestion.findById(session.questions[0].questionId).lean()
      : null;
    const question = session.questions?.[0]?.text || questionRecord?.text || session.title || '';
    const expectedConcepts = [
      ...(session.questions?.[0]?.expectedConcepts || []),
      ...(questionRecord?.keywords || []),
      ...(questionRecord?.evaluationCriteria || []).map((criterion) => criterion.name).filter(Boolean),
    ];
    const aiAnalysis = await analyzeWithPythonService({
      question,
      answer: session.transcription || '',
      expectedConcepts: [...new Set(expectedConcepts)],
      metrics: {
        clarity: speechMetrics.clarity,
        wpm: speechMetrics.pace,
        fillers: speechMetrics.fillers,
        pause: speechMetrics.averagePauseDuration,
        communication_metrics: {
          clarity: speechMetrics.clarity,
          pace: speechMetrics.pace,
          fillers: speechMetrics.fillers,
          pause: speechMetrics.averagePauseDuration,
        },
        confidence_score: confidenceMetrics.overallConfidenceScore,
        eye_contact: confidenceMetrics.eyeContact,
        head_stability: confidenceMetrics.posture,
        nervousness: confidenceMetrics.nervousness,
      },
    });
    const finalAiReport = generateInterviewReport({
      session,
      speechMetrics,
      confidenceMetrics,
      transcript: session.transcription || '',
      question,
      aiAnalysis,
    });

    // Generate insights
    const sessionAudit = buildSessionAudit(speechMetrics, confidenceMetrics);
    console.log(`[Report] Loaded persisted observations: speech=${speechMetrics.insights?.length || 0}, confidence=${confidenceMetrics.insights?.length || 0}, timeline=${confidenceMetrics.metricsByTimestamp?.length || 0}`);
    const strengths = deduplicateFindings([
      ...finalAiReport.strengths,
      ...sessionAudit.strengths,
      ...generateStrengths(speechMetrics, confidenceMetrics),
    ]);
    const areasForImprovement = deduplicateFindings([
      ...generateAreasForImprovement(speechMetrics, confidenceMetrics),
      ...sessionAudit.weaknesses,
    ]);
    const recommendations = finalAiReport.recommendations.length > 0 ? finalAiReport.recommendations : generateRecommendations(speechMetrics, confidenceMetrics);

    // Create report
    const report = await Report.create({
      sessionId,
      userId: req.user.id,
      title: session.title,
      description: `Report for interview: ${session.title}`,
      overallScore: finalAiReport.overallScore || overallScore,
      confidenceScore,
      speechScore,
      contentScore: finalAiReport.communicationScore,
      communicationScore: finalAiReport.communicationScore,
      contentQualityScore: finalAiReport.contentQualityScore,
      categories: [
        { name: 'Communication', score: finalAiReport.communicationScore, weight: 0.35 },
        { name: 'Confidence & Body Language', score: confidenceScore, weight: 0.4 },
        { name: 'Content Quality', score: finalAiReport.contentQualityScore, weight: 0.25 },
      ],
      speechAnalysis: {
        paceSummary: `Pace: ${speechMetrics.pace || 0} WPM`,
        clarityScore: speechMetrics.clarity || 0,
        articulationScore: speechMetrics.articulation || 0,
        fillerCount: speechMetrics.fillers || 0,
        pauseAnalysis: `Average pause: ${speechMetrics.averagePauseDuration || 0}s`,
      },
      confidenceAnalysis: {
        eyeContactScore: confidenceMetrics.eyeContact || 0,
        postureScore: confidenceMetrics.posture || 0,
        gestureScore: confidenceMetrics.gestures || 0,
        engagementScore: confidenceMetrics.engagement || 0,
        nervousnessLevel: nervousnessLevel(confidenceMetrics.nervousness || 0),
      },
      contentAnalysis: {
        completenessScore: finalAiReport.metrics.completeness,
        accuracyScore: finalAiReport.metrics.accuracy,
        relevanceScore: finalAiReport.metrics.relevance,
        depthOfKnowledge: depthLevel(finalAiReport.metrics.completeness),
      },
      strengths,
      areasForImprovement,
      recommendations,
      executiveSummary: finalAiReport.summary || generateExecutiveSummary(overallScore, strengths, areasForImprovement),
      detailedFeedback: finalAiReport.summary || generateDetailedFeedback(session, speechMetrics, confidenceMetrics),
      structuredCoaching: finalAiReport.structuredCoaching,
      sessionAudit,
    });

    // Update user average score
    const user = await User.findById(req.user.id);
    user.averageScore = (user.averageScore * (user.completedSessions - 1) + finalAiReport.overallScore) / user.completedSessions;
    await user.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'report_generated',
      resourceType: 'Report',
      resourceId: report._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    console.log(`[Report] session=${sessionId} observations=${sessionAudit.totalSnapshots} strengths=${strengths.length} weaknesses=${areasForImprovement.length} ai=${aiAnalysis ? 'available' : 'fallback'}`);

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
    });
  }
};

// @desc    Get all reports for current user
// @route   GET /api/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt' } = req.query;
    let query = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const reports = await Report.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ [sortBy]: -1 });

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        currentPage: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
    });
  }
};

// @desc    Get report details
// @route   GET /api/reports/:id
// @access  Private
exports.getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('sessionId');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this report',
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'report_viewed',
      resourceType: 'Report',
      resourceId: report._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Get Report By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report',
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_report_action',
      resourceType: 'Report',
      resourceId: req.params.id,
      status: 'success',
      details: { action: 'report_deleted' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Delete Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
    });
  }
};

// Helper functions
function generateStrengths(speechMetrics, confidenceMetrics) {
  const strengths = [];
  
  if (speechMetrics?.clarity > 80) strengths.push('Clear and articulate speech');
  if (confidenceMetrics?.eyeContact > 80) strengths.push('Excellent eye contact');
  if (confidenceMetrics?.posture > 80) strengths.push('Professional posture');
  if (speechMetrics?.completeness > 80) strengths.push('Comprehensive answers');
  if (confidenceMetrics?.engagement > 80) strengths.push('High engagement');

  return strengths.length > 0 ? strengths : ['Good overall performance'];
}

function buildSessionAudit(speechMetrics, confidenceMetrics) {
  const observations = [];
  const strengths = [];
  const weaknesses = [];
  const speechInsights = Array.isArray(speechMetrics?.insights) ? speechMetrics.insights : [];
  const confidenceInsights = Array.isArray(confidenceMetrics?.insights) ? confidenceMetrics.insights : [];
  const confidenceTimeline = Array.isArray(confidenceMetrics?.metricsByTimestamp) ? confidenceMetrics.metricsByTimestamp : [];

  const addObservation = (category, metric, value, good, feedback, timestamp) => {
    observations.push({
      timestamp: timestamp || Date.now(),
      category,
      metric,
      value: Number(value || 0),
      status: good ? 'strength' : 'weakness',
      feedback,
    });
    const target = good ? strengths : weaknesses;
    if (!target.includes(feedback)) target.push(feedback);
  };

  const seenCompletionSnapshots = new Set();
  [...speechInsights, ...confidenceInsights].forEach((insight) => {
    if (!insight.feedback) return;
    const category = insight.metric?.startsWith('confidence') ? 'confidence' : 'speech';
    const completionKey = `${insight.metric}:${insight.value}:${insight.feedback}`;
    if (insight.metric === 'session-completion') {
      if (seenCompletionSnapshots.has(completionKey)) return;
      seenCompletionSnapshots.add(completionKey);
    }
    if (!observations.some((item) => item.feedback === insight.feedback && item.timestamp === insight.timestamp)) {
      const good = category === 'confidence'
        ? Number(insight.value) >= 70
        : insight.metric === 'session-completion'
          ? Number(insight.value) >= 70
          : false;
      addObservation(category, insight.metric, insight.value, good, insight.feedback, insight.timestamp);
    }
  });

  if (confidenceInsights.length === 0) {
    confidenceTimeline.forEach((point) => {
      addObservation('confidence', 'timeline', point.engagement ?? point.eyeContact, true,
        `Persisted confidence snapshot: eye contact ${point.eyeContact}, posture ${point.posture}`,
        point.timestamp);
    });
  }

  return {
    totalSnapshots: observations.length,
    strengths,
    weaknesses,
    observations,
  };
}

function deduplicateFindings(items) {
  const selected = new Map();
  items.filter(Boolean).forEach((item) => {
    const text = String(item).trim();
    const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
    const category = normalized.includes('eye contact') ? 'eye-contact'
      : normalized.includes('speech') || normalized.includes('clarity') ? 'speech-clarity'
      : normalized.includes('pace') || normalized.includes('speaking') ? 'pace'
      : normalized.includes('posture') || normalized.includes('body language') ? 'posture'
      : normalized.includes('filler') ? 'fillers'
      : normalized.includes('engagement') ? 'engagement'
      : normalized;
    const existing = selected.get(category);
    if (!existing || text.length > existing.length) selected.set(category, text);
  });
  return [...selected.values()];
}

function generateAreasForImprovement(speechMetrics, confidenceMetrics) {
  const areas = [];
  
  if (speechMetrics?.clarity < 70) areas.push('Improve speech clarity');
  if (speechMetrics?.fillers > 10) areas.push('Reduce filler words');
  if (confidenceMetrics?.nervousness > 50) areas.push('Work on managing nervousness');
  if (confidenceMetrics?.gestures < 60) areas.push('Use more purposeful gestures');
  if (speechMetrics?.pace < 100 || speechMetrics?.pace > 180) areas.push('Adjust speaking pace');

  return areas.length > 0 ? areas : ['Continue practicing'];
}

function generateRecommendations(speechMetrics, confidenceMetrics) {
  const recommendations = [];
  
  if (speechMetrics?.clarity < 70) {
    recommendations.push({
      category: 'Speech',
      suggestion: 'Practice pronunciation exercises daily',
      priority: 'high',
    });
  }
  
  if (confidenceMetrics?.nervousness > 50) {
    recommendations.push({
      category: 'Confidence',
      suggestion: 'Practice relaxation techniques before interviews',
      priority: 'high',
    });
  }
  
  if (speechMetrics?.fillers > 10) {
    recommendations.push({
      category: 'Speech',
      suggestion: 'Record yourself and listen for filler words',
      priority: 'medium',
    });
  }

  return recommendations;
}

function nervousnessLevel(nervousness) {
  if (nervousness < 30) return 'Very Confident';
  if (nervousness < 50) return 'Confident';
  if (nervousness < 70) return 'Moderately Nervous';
  return 'Very Nervous';
}

function depthLevel(completeness) {
  if (completeness > 80) return 'Excellent';
  if (completeness > 60) return 'Good';
  if (completeness > 40) return 'Fair';
  return 'Needs Improvement';
}

function generateExecutiveSummary(score, strengths, areas) {
  const scoreLevel = score > 80 ? 'Excellent' : score > 60 ? 'Good' : score > 40 ? 'Fair' : 'Needs Improvement';
  return `Overall Score: ${scoreLevel} (${score.toFixed(1)}/100). Your key strengths include ${strengths.slice(0, 2).join(' and ')}. Focus on ${areas[0] || 'continuous improvement'}.`;
}

function generateDetailedFeedback(session, speechMetrics, confidenceMetrics) {
  return `During this ${(session.duration / 60).toFixed(1)} minute interview, you demonstrated good communication skills. 
  Your speech clarity was at ${speechMetrics?.clarity || 75}/100, with an average speaking pace of ${speechMetrics?.pace || 120} words per minute. 
  Body language showed ${confidenceMetrics?.gestures || 70}/100 for purposeful gestures and ${confidenceMetrics?.eyeContact || 75}/100 for eye contact.
  Continue practicing to further improve these areas.`;
}

exports.buildSessionAudit = buildSessionAudit;
exports.deduplicateFindings = deduplicateFindings;
