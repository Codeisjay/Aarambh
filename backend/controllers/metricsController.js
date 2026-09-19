const SpeechMetrics = require('../models/SpeechMetrics');
const ConfidenceMetrics = require('../models/ConfidenceMetrics');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');

// ====== SPEECH METRICS ======

// @desc    Create or update speech metrics for a session
// @route   POST /api/metrics/speech/:sessionId
// @access  Private
exports.updateSpeechMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const metrics = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update metrics for this session',
      });
    }

    let speechMetrics = await SpeechMetrics.findOne({ sessionId });

    if (speechMetrics) {
      // Update existing metrics
      Object.assign(speechMetrics, metrics);
      await speechMetrics.save();
    } else {
      // Create new metrics
      speechMetrics = await SpeechMetrics.create({
        sessionId,
        userId: req.user.id,
        ...metrics,
      });

      // Associate with session
      session.speechMetricsId = speechMetrics._id;
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: 'Speech metrics updated',
      data: speechMetrics,
    });
  } catch (error) {
    console.error('Update Speech Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating speech metrics',
    });
  }
};

// @desc    Get speech metrics for a session
// @route   GET /api/metrics/speech/:sessionId
// @access  Private
exports.getSpeechMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session',
      });
    }

    const speechMetrics = await SpeechMetrics.findOne({ sessionId });

    if (!speechMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Speech metrics not found for this session',
      });
    }

    res.status(200).json({
      success: true,
      data: speechMetrics,
    });
  } catch (error) {
    console.error('Get Speech Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching speech metrics',
    });
  }
};

// @desc    Add speech insight
// @route   POST /api/metrics/speech/:sessionId/insights
// @access  Private
exports.addSpeechInsight = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { timestamp, metric, value, feedback } = req.body;

    const speechMetrics = await SpeechMetrics.findOne({ sessionId });

    if (!speechMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Speech metrics not found',
      });
    }

    speechMetrics.insights.push({
      timestamp,
      metric,
      value,
      feedback,
    });

    await speechMetrics.save();

    res.status(200).json({
      success: true,
      message: 'Insight added',
      data: speechMetrics,
    });
  } catch (error) {
    console.error('Add Speech Insight Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding insight',
    });
  }
};

// ====== CONFIDENCE METRICS ======

// @desc    Create or update confidence metrics for a session
// @route   POST /api/metrics/confidence/:sessionId
// @access  Private
exports.updateConfidenceMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const metrics = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update metrics for this session',
      });
    }

    let confidenceMetrics = await ConfidenceMetrics.findOne({ sessionId });
    const timestamp = Date.now();
    const confidenceFeedback = metrics.recommendations?.length
      ? metrics.recommendations.join(' ')
      : `Confidence ${metrics.overallConfidenceScore ?? 0}, eye contact ${metrics.eyeContact ?? 0}, posture ${metrics.posture ?? 0}`;
    const observation = {
      timestamp,
      metric: 'confidence-snapshot',
      value: Number(metrics.overallConfidenceScore) || 0,
      feedback: confidenceFeedback,
    };
    const timelinePoint = {
      timestamp,
      eyeContact: Number(metrics.eyeContact) || 0,
      posture: Number(metrics.posture) || 0,
      gestures: Number(metrics.gestures) || 0,
      nervousness: Number(metrics.nervousness) || 0,
      engagement: Number(metrics.engagement) || 0,
    };

    if (confidenceMetrics) {
      // Update existing metrics
      Object.assign(confidenceMetrics, metrics);
      confidenceMetrics.insights.push(observation);
      confidenceMetrics.metricsByTimestamp.push(timelinePoint);
      await confidenceMetrics.save();
    } else {
      // Create new metrics
      confidenceMetrics = await ConfidenceMetrics.create({
        sessionId,
        userId: req.user.id,
        ...metrics,
        insights: [observation],
        metricsByTimestamp: [timelinePoint],
      });

      // Associate with session
      session.confidenceMetricsId = confidenceMetrics._id;
      await session.save();
    }

    console.log(`[Metrics] Persisted confidence observation for ${sessionId}: insights=${confidenceMetrics.insights.length}, timeline=${confidenceMetrics.metricsByTimestamp.length}`);

    res.status(200).json({
      success: true,
      message: 'Confidence metrics updated',
      data: confidenceMetrics,
    });
  } catch (error) {
    console.error('Update Confidence Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating confidence metrics',
    });
  }
};

// @desc    Get confidence metrics for a session
// @route   GET /api/metrics/confidence/:sessionId
// @access  Private
exports.getConfidenceMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session',
      });
    }

    const confidenceMetrics = await ConfidenceMetrics.findOne({ sessionId });

    if (!confidenceMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Confidence metrics not found for this session',
      });
    }

    res.status(200).json({
      success: true,
      data: confidenceMetrics,
    });
  } catch (error) {
    console.error('Get Confidence Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching confidence metrics',
    });
  }
};

// @desc    Add confidence insight
// @route   POST /api/metrics/confidence/:sessionId/insights
// @access  Private
exports.addConfidenceInsight = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { timestamp, metric, value, feedback } = req.body;

    const confidenceMetrics = await ConfidenceMetrics.findOne({ sessionId });

    if (!confidenceMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Confidence metrics not found',
      });
    }

    confidenceMetrics.insights.push({
      timestamp,
      metric,
      value,
      feedback,
    });

    await confidenceMetrics.save();

    res.status(200).json({
      success: true,
      message: 'Insight added',
      data: confidenceMetrics,
    });
  } catch (error) {
    console.error('Add Confidence Insight Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding insight',
    });
  }
};

// @desc    Add timestamp metrics (real-time updates)
// @route   POST /api/metrics/confidence/:sessionId/timeline
// @access  Private
exports.addConfidenceTimeline = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { timestamp, eyeContact, posture, gestures, nervousness, engagement } = req.body;

    const confidenceMetrics = await ConfidenceMetrics.findOne({ sessionId });

    if (!confidenceMetrics) {
      return res.status(404).json({
        success: false,
        message: 'Confidence metrics not found',
      });
    }

    confidenceMetrics.metricsByTimestamp.push({
      timestamp,
      eyeContact,
      posture,
      gestures,
      nervousness,
      engagement,
    });

    await confidenceMetrics.save();

    res.status(200).json({
      success: true,
      message: 'Timeline metrics added',
      data: confidenceMetrics,
    });
  } catch (error) {
    console.error('Add Confidence Timeline Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding timeline metrics',
    });
  }
};

// @desc    Get all metrics summary for a session
// @route   GET /api/metrics/:sessionId/summary
// @access  Private
exports.getMetricsSummary = async (req, res) => {
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
        message: 'Not authorized to access this session',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session._id,
          title: session.title,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.duration,
        },
        speechMetrics: session.speechMetricsId,
        confidenceMetrics: session.confidenceMetricsId,
      },
    });
  } catch (error) {
    console.error('Get Metrics Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching metrics summary',
    });
  }
};
