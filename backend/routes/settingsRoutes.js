const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateInterviewSettings,
  updateAiThresholds,
  updateMediaSettings,
  updateNotificationSettings,
  updateDisplaySettings,
  updatePrivacySettings,
  resetSettings,
} = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get settings
router.get('/', getSettings);

// Update different setting categories
router.put('/interview', updateInterviewSettings);
router.put('/ai-thresholds', updateAiThresholds);
router.put('/media', updateMediaSettings);
router.put('/notifications', updateNotificationSettings);
router.put('/display', updateDisplaySettings);
router.put('/privacy', updatePrivacySettings);

// Reset to default
router.post('/reset', resetSettings);

module.exports = router;
