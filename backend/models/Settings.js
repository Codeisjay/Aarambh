const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  
  // Interview Preferences
  interviewSettings: {
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'mixed'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'system-design', 'mixed'],
      default: 'mixed',
    },
    duration: {
      type: Number,
      default: 30, // in minutes
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    videoRecording: {
      type: Boolean,
      default: true,
    },
    feedbackLevel: {
      type: String,
      enum: ['basic', 'detailed', 'comprehensive'],
      default: 'detailed',
    },
  },
  
  // Audio/Video Settings
  mediaSettings: {
    microphoneId: String,
    cameraId: String,
    microphoneVolume: {
      type: Number,
      default: 80,
    },
    cameraResolution: {
      type: String,
      enum: ['360p', '480p', '720p', '1080p'],
      default: '720p',
    },
    enableAutoGain: {
      type: Boolean,
      default: true,
    },
    enableNoiseCancellation: {
      type: Boolean,
      default: true,
    },
  },
  
  // Notification Settings
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    reminderBefore: {
      type: Number,
      default: 15, // in minutes
    },
    newReportNotification: {
      type: Boolean,
      default: true,
    },
    weeklyProgress: {
      type: Boolean,
      default: true,
    },
  },
  
  // Display Settings
  displaySettings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark',
    },
    language: {
      type: String,
      default: 'en',
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium',
    },
    compactMode: {
      type: Boolean,
      default: false,
    },
  },
  
  // Analytics Settings
  analyticsSettings: {
    trackPerformance: {
      type: Boolean,
      default: true,
    },
    trackBehavior: {
      type: Boolean,
      default: true,
    },
    dataRetention: {
      type: String,
      enum: ['3-months', '6-months', '1-year', '2-years', 'indefinite'],
      default: '1-year',
    },
  },

  // AI Decision thresholds
  aiThresholds: {
    eyeContactThreshold: {
      type: Number,
      default: 75,
    },
    fillerThreshold: {
      type: Number,
      default: 5,
    },
    wpmThreshold: {
      type: Number,
      default: 90,
    },
    pauseThreshold: {
      type: Number,
      default: 3,
    },
    blinkThreshold: {
      type: Number,
      default: 25,
    },
  },
  
  // Privacy Settings
  privacySettings: {
    profilePrivacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'private',
    },
    showProgressOnLeaderboard: {
      type: Boolean,
      default: false,
    },
    allowDataSharing: {
      type: Boolean,
      default: false,
    },
  },
  
  // Advanced Settings
  advancedSettings: {
    apiKey: String,
    webhookUrl: String,
    integrations: [{
      provider: String,
      connected: Boolean,
      accessToken: String,
      refreshToken: String,
    }],
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
