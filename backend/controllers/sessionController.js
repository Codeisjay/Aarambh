const Session = require('../models/Session');
const SpeechMetrics = require('../models/SpeechMetrics');
const ConfidenceMetrics = require('../models/ConfidenceMetrics');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Create a new interview session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { title, description, category, difficulty, questionIds = [] } = req.body;

    const session = await Session.create({
      userId: req.user.id,
      title,
      description,
      category,
      difficulty,
      status: 'setup',
    });

    // Update user session count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalSessions: 1 } });

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_created',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating session',
    });
  }
};

// @desc    Get all sessions for current user
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, difficulty } = req.query;
    let query = { userId: req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const skip = (page - 1) * limit;

    const sessions = await Session.find(query)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Session.countDocuments(query);

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        currentPage: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Get Sessions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
    });
  }
};

// @desc    Get session details
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('speechMetricsId')
      .populate('confidenceMetricsId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Ensure user owns this session
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session',
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get Session By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching session',
    });
  }
};

// @desc    Start interview session
// @route   PUT /api/sessions/:id/start
// @access  Private
exports.startSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

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

    session.status = 'in-progress';
    session.startTime = new Date();
    await session.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_started',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session started',
      data: session,
    });
  } catch (error) {
    console.error('Start Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting session',
    });
  }
};

// @desc    Pause interview session
// @route   PUT /api/sessions/:id/pause
// @access  Private
exports.pauseSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

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

    session.status = 'paused';
    await session.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_paused',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session paused',
      data: session,
    });
  } catch (error) {
    console.error('Pause Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing session',
    });
  }
};

// @desc    Resume interview session
// @route   PUT /api/sessions/:id/resume
// @access  Private
exports.resumeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

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

    session.status = 'in-progress';
    await session.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_started',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session resumed',
      data: session,
    });
  } catch (error) {
    console.error('Resume Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming session',
    });
  }
};

// @desc    Complete interview session
// @route   PUT /api/sessions/:id/complete
// @access  Private
exports.completeSession = async (req, res) => {
  try {
    const { transcription, feedback, duration, speechMetrics } = req.body;

    const session = await Session.findById(req.params.id);

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

    const wasAlreadyCompleted = session.status === 'completed';
    session.status = 'completed';
    session.endTime = new Date();
    const requestedDuration = Number(duration);
    const measuredDuration = session.startTime
      ? Math.floor((session.endTime - session.startTime) / 1000)
      : 0;
    session.duration = Number.isFinite(requestedDuration) && requestedDuration > 0
      ? Math.floor(requestedDuration)
      : measuredDuration;
    
    if (transcription) session.transcription = transcription;
    if (feedback) session.feedback = feedback;

    if (speechMetrics) {
      const speech = await SpeechMetrics.findOneAndUpdate(
        { sessionId: session._id, userId: req.user.id },
        {
          $set: {
            sessionId: session._id,
            userId: req.user.id,
            pace: Number(speechMetrics.pace) || 0,
            fillers: Number(speechMetrics.fillers) || 0,
            clarity: Number(speechMetrics.clarity) || 0,
            overallScore: Number(speechMetrics.clarity) || 0,
          },
          ...(wasAlreadyCompleted ? {} : {
            $push: { insights: {
              timestamp: Date.now(),
              metric: 'session-completion',
              value: Number(speechMetrics.clarity) || 0,
              feedback: `Completed session speech snapshot: ${Number(speechMetrics.pace) || 0} WPM, ${Number(speechMetrics.fillers) || 0} fillers`,
            } },
          }),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      session.speechMetricsId = speech._id;
    }

    await session.save();

    // Update user stats
    if (!wasAlreadyCompleted) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { completedSessions: 1 } });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_completed',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session completed',
      data: session,
    });
  } catch (error) {
    console.error('Complete Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing session',
    });
  }
};

// @desc    Cancel interview session
// @route   PUT /api/sessions/:id/cancel
// @access  Private
exports.cancelSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

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

    session.status = 'cancelled';
    await session.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_created',
      resourceType: 'Session',
      resourceId: session._id.toString(),
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session cancelled',
      data: session,
    });
  } catch (error) {
    console.error('Cancel Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling session',
    });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session',
      });
    }

    // Delete associated metrics
    if (session.speechMetricsId) {
      await SpeechMetrics.findByIdAndDelete(session.speechMetricsId);
    }
    if (session.confidenceMetricsId) {
      await ConfidenceMetrics.findByIdAndDelete(session.confidenceMetricsId);
    }

    await Session.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      userId: req.user.id,
      action: 'session_created',
      resourceType: 'Session',
      resourceId: req.params.id,
      status: 'success',
      details: { action: 'session_deleted' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting session',
    });
  }
};

// @desc    Add note to session
// @route   POST /api/sessions/:id/notes
// @access  Private
exports.addSessionNote = async (req, res) => {
  try {
    const { note, timestamp } = req.body;

    const session = await Session.findById(req.params.id);

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

    session.notes.push({
      timestamp: timestamp || 0,
      note,
      createdAt: new Date(),
    });

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Note added to session',
      data: session,
    });
  } catch (error) {
    console.error('Add Session Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note',
    });
  }
};
