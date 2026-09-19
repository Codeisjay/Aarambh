const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
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
  
  // Overall Scores
  overallScore: {
    type: Number,
    default: 0, // 0-100
  },
  confidenceScore: {
    type: Number,
    default: 0, // 0-100
  },
  speechScore: {
    type: Number,
    default: 0, // 0-100
  },
  contentScore: {
    type: Number,
    default: 0, // 0-100
  },
  communicationScore: {
    type: Number,
    default: 0,
  },
  contentQualityScore: {
    type: Number,
    default: 0,
  },
  
  // Category Breakdown
  categories: [{
    name: String,
    score: Number,
    weight: Number,
  }],
  
  // Speech Analysis Summary
  speechAnalysis: {
    paceSummary: String,
    clarityScore: Number,
    articulationScore: Number,
    fillerCount: Number,
    pauseAnalysis: String,
  },
  
  // Confidence Analysis Summary
  confidenceAnalysis: {
    eyeContactScore: Number,
    postureScore: Number,
    gestureScore: Number,
    engagementScore: Number,
    nervousnessLevel: String,
  },
  
  // Content Analysis Summary
  contentAnalysis: {
    completenessScore: Number,
    accuracyScore: Number,
    relevanceScore: Number,
    depthOfKnowledge: String,
  },
  
  // Strengths
  strengths: [String],
  
  // Areas for Improvement
  areasForImprovement: [String],
  
  // Recommendations
  recommendations: [{
    category: String,
    suggestion: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
  }],
  
  // Comparison with Previous Sessions
  progressComparison: {
    previousScore: Number,
    scoreChange: Number,
    improvementAreas: [String],
  },
  
  // Generated Summary
  executiveSummary: String,
  
  // Detailed Feedback
  detailedFeedback: String,
  
    structuredCoaching: {
      technicalAccuracy: Number,
      completeness: Number,
      answerQuality: Number,
      missingConcepts: [String],
      strengths: [String],
      weaknesses: [String],
      coaching: String,
      improvedAnswer: String,
      provider: String,
    },

  sessionAudit: {
    totalSnapshots: { type: Number, default: 0 },
    strengths: [String],
    weaknesses: [String],
    observations: [{
      timestamp: Number,
      category: String,
      metric: String,
      value: Number,
      status: String,
      feedback: String,
    }],
  },
  
  // Report Status
  status: {
    type: String,
    enum: ['draft', 'completed', 'reviewed'],
    default: 'completed',
  },
  
  // Generated Report File
  reportFile: {
    type: String,
    default: null,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
