const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['technical', 'behavioral', 'system-design', 'mixed'],
    default: 'mixed',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  cv: {
    originalName: String,
    mimeType: String,
    size: Number,
    data: {
      type: Buffer,
      select: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  resumeProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  status: {
    type: String,
    enum: ['setup', 'in-progress', 'paused', 'completed', 'cancelled'],
    default: 'setup',
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  questions: [{
    questionId: mongoose.Schema.Types.ObjectId,
    text: String,
    topic: String,
    difficulty: String,
    expectedConcepts: [String],
    candidateAnswer: String,
    extractedTopics: [String],
    confidence: String,
    depthScore: Number,
    answeredCorrectly: Boolean,
    followUp: Boolean,
    expectedTime: Number, // in seconds
    askedAt: Date,
    answeredAt: Date,
    skipped: Boolean,
  }],
  interviewHistory: [{
    askedQuestion: String,
    candidateAnswer: String,
    extractedTopics: [String],
    confidence: String,
    depthScore: Number,
    answeredCorrectly: Boolean,
    topic: String,
    difficulty: String,
    expectedConcepts: [String],
    followUp: Boolean,
    askedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  overallScore: {
    type: Number,
    default: 0,
  },
  confidenceScore: {
    type: Number,
    default: 0,
  },
  speechMetricsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpeechMetrics',
    default: null,
  },
  confidenceMetricsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ConfidenceMetrics',
    default: null,
  },
  videoUrl: {
    type: String,
    default: null,
  },
  transcription: {
    type: String,
    default: null,
  },
  feedback: {
    type: String,
    default: null,
  },
  notes: [{
    timestamp: Number,
    note: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
