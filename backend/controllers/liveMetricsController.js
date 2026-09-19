const Session = require('../models/Session');
const SpeechMetrics = require('../models/SpeechMetrics');
const ConfidenceMetrics = require('../models/ConfidenceMetrics');
const AuditLog = require('../models/AuditLog');
const { evaluateInterviewSnapshot } = require('../services/decisionEngine');
const { emitSessionMetrics, emitSessionFeedback, emitConfidenceUpdate } = require('../services/socketService');

const buildSnapshot = (payload = {}) => ({
  eyeContact: Number(payload.eyeContact ?? payload.eye_contact ?? 0),
  blinkRate: Number(payload.blinkRate ?? payload.blink_rate ?? 0),
  headStability: Number(payload.headStability ?? payload.head_stability ?? 0),
  clarity: Number(payload.clarity ?? 0),
  fillerWords: Number(payload.fillerWords ?? payload.fillers ?? 0),
  wpm: Number(payload.wpm ?? 0),
  pauseDuration: Number(payload.pauseDuration ?? payload.pause ?? 0),
  smileScore: Number(payload.smileScore ?? 0),
  faceCentered: Boolean(payload.faceCentered ?? true),
  transcript: payload.transcript || '',
});

exports.receiveLiveMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const payload = buildSnapshot(req.body || {});

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this session' });
    }

    const evaluation = evaluateInterviewSnapshot(payload);
    const timestamp = Date.now();

    const speechUpdate = {
      sessionId,
      userId: req.user.id,
      pace: payload.wpm,
      clarity: payload.clarity,
      fillers: payload.fillerWords,
      averagePauseDuration: payload.pauseDuration,
      pitch: payload.pitch || 0,
      volume: payload.energy || 0,
      transcript: payload.transcript || '',
      overallScore: evaluation.overallConfidence,
      updatedAt: new Date(),
    };

    const confidenceUpdate = {
      sessionId,
      userId: req.user.id,
      eyeContact: payload.eyeContact,
      posture: payload.headStability,
      movement: payload.headStability,
      engagement: payload.eyeContact,
      nervousness: Math.max(0, 100 - evaluation.overallConfidence),
      overallConfidenceScore: evaluation.overallConfidence,
      updatedAt: new Date(),
    };

    const speechMetrics = await SpeechMetrics.findOneAndUpdate(
      { sessionId },
      {
        $set: speechUpdate,
        $push: {
          insights: {
            timestamp,
            metric: 'live-analysis',
            value: evaluation.communicationScore,
            feedback: evaluation.feedback.map((item) => item.text).join(' '),
          },
        },
      },
      { new: true, upsert: true }
    );

    const confidenceMetrics = await ConfidenceMetrics.findOneAndUpdate(
      { sessionId },
      {
        $set: confidenceUpdate,
        $push: {
          insights: {
            timestamp,
            metric: 'confidence',
            value: evaluation.behaviorScore,
            feedback: evaluation.feedback.map((item) => item.text).join(' '),
          },
          metricsByTimestamp: {
            timestamp,
            eyeContact: payload.eyeContact,
            posture: payload.headStability,
            gestures: payload.headStability,
            nervousness: Math.max(0, 100 - evaluation.overallConfidence),
            engagement: payload.eyeContact,
          },
        },
      },
      { new: true, upsert: true }
    );

    session.speechMetricsId = speechMetrics._id;
    session.confidenceMetricsId = confidenceMetrics._id;
    if (payload.transcript) session.transcription = payload.transcript;
    await session.save();

    const feedback = evaluation.feedback.map((item) => ({
      type: item.type,
      text: item.text,
      timestamp,
    }));

    emitSessionMetrics(sessionId, {
      ...payload,
      overallConfidence: evaluation.overallConfidence,
      evaluation,
      timestamp,
      feedback,
    });
    emitSessionFeedback(sessionId, feedback);
    emitConfidenceUpdate(sessionId, {
      sessionId,
      overallConfidence: evaluation.overallConfidence,
      communicationScore: evaluation.communicationScore,
      behaviorScore: evaluation.behaviorScore,
      feedback,
      timestamp,
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'system_test',
      resourceType: 'Session',
      resourceId: sessionId,
      severity: 'info',
      details: {
        source: 'live-metrics',
        score: evaluation.overallConfidence,
        message: evaluation.feedback[0]?.text || 'Live metrics updated',
      },
      status: 'success',
    });

    return res.status(200).json({
      success: true,
      message: 'Live metrics received',
      data: {
        ...payload,
        evaluation,
        timestamp,
      },
    });
  } catch (error) {
    console.error('Receive Live Metrics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing live metrics',
    });
  }
};

exports.getLiveMetrics = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this session' });
    }

    const speechMetrics = await SpeechMetrics.findOne({ sessionId });
    const confidenceMetrics = await ConfidenceMetrics.findOne({ sessionId });

    return res.status(200).json({
      success: true,
      data: {
        speechMetrics,
        confidenceMetrics,
      },
    });
  } catch (error) {
    console.error('Get Live Metrics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error loading live metrics',
    });
  }
};
