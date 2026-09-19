const Settings = require('../models/Settings');
const AuditLog = require('../models/AuditLog');

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
      settings = await Settings.create({ userId: req.user.id });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
    });
  }
};

// @desc    Update interview settings
// @route   PUT /api/settings/interview
// @access  Private
exports.updateInterviewSettings = async (req, res) => {
  try {
    const { difficulty, category, duration, autoSave, videoRecording, feedbackLevel } = req.body;

    const updateData = { 'interviewSettings': {} };
    if (difficulty) updateData.interviewSettings.difficulty = difficulty;
    if (category) updateData.interviewSettings.category = category;
    if (duration) updateData.interviewSettings.duration = duration;
    if (autoSave !== undefined) updateData.interviewSettings.autoSave = autoSave;
    if (videoRecording !== undefined) updateData.interviewSettings.videoRecording = videoRecording;
    if (feedbackLevel) updateData.interviewSettings.feedbackLevel = feedbackLevel;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'interview', changes: updateData.interviewSettings },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Interview settings updated',
      data: settings,
    });
  } catch (error) {
    console.error('Update Interview Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
    });
  }
};

exports.updateAiThresholds = async (req, res) => {
  try {
    const thresholds = req.body || {};
    const updateData = { aiThresholds: {} };

    if (thresholds.eyeContactThreshold !== undefined) updateData.aiThresholds.eyeContactThreshold = Number(thresholds.eyeContactThreshold);
    if (thresholds.fillerThreshold !== undefined) updateData.aiThresholds.fillerThreshold = Number(thresholds.fillerThreshold);
    if (thresholds.wpmThreshold !== undefined) updateData.aiThresholds.wpmThreshold = Number(thresholds.wpmThreshold);
    if (thresholds.pauseThreshold !== undefined) updateData.aiThresholds.pauseThreshold = Number(thresholds.pauseThreshold);
    if (thresholds.blinkThreshold !== undefined) updateData.aiThresholds.blinkThreshold = Number(thresholds.blinkThreshold);

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'ai-thresholds', changes: updateData.aiThresholds },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({ success: true, message: 'AI thresholds updated', data: settings });
  } catch (error) {
    console.error('Update AI Thresholds Error:', error);
    res.status(500).json({ success: false, message: 'Error updating AI thresholds' });
  }
};

// @desc    Update media settings
// @route   PUT /api/settings/media
// @access  Private
exports.updateMediaSettings = async (req, res) => {
  try {
    const { microphoneId, cameraId, microphoneVolume, cameraResolution, enableAutoGain, enableNoiseCancellation } = req.body;

    const updateData = { 'mediaSettings': {} };
    if (microphoneId) updateData.mediaSettings.microphoneId = microphoneId;
    if (cameraId) updateData.mediaSettings.cameraId = cameraId;
    if (microphoneVolume !== undefined) updateData.mediaSettings.microphoneVolume = microphoneVolume;
    if (cameraResolution) updateData.mediaSettings.cameraResolution = cameraResolution;
    if (enableAutoGain !== undefined) updateData.mediaSettings.enableAutoGain = enableAutoGain;
    if (enableNoiseCancellation !== undefined) updateData.mediaSettings.enableNoiseCancellation = enableNoiseCancellation;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'media', changes: updateData.mediaSettings },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Media settings updated',
      data: settings,
    });
  } catch (error) {
    console.error('Update Media Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
    });
  }
};

// @desc    Update notification settings
// @route   PUT /api/settings/notifications
// @access  Private
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { emailNotifications, reminderBefore, newReportNotification, weeklyProgress } = req.body;

    const updateData = { 'notificationSettings': {} };
    if (emailNotifications !== undefined) updateData.notificationSettings.emailNotifications = emailNotifications;
    if (reminderBefore !== undefined) updateData.notificationSettings.reminderBefore = reminderBefore;
    if (newReportNotification !== undefined) updateData.notificationSettings.newReportNotification = newReportNotification;
    if (weeklyProgress !== undefined) updateData.notificationSettings.weeklyProgress = weeklyProgress;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'notifications', changes: updateData.notificationSettings },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Notification settings updated',
      data: settings,
    });
  } catch (error) {
    console.error('Update Notification Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
    });
  }
};

// @desc    Update display settings
// @route   PUT /api/settings/display
// @access  Private
exports.updateDisplaySettings = async (req, res) => {
  try {
    const { theme, language, fontSize, compactMode } = req.body;

    const updateData = { 'displaySettings': {} };
    if (theme) updateData.displaySettings.theme = theme;
    if (language) updateData.displaySettings.language = language;
    if (fontSize) updateData.displaySettings.fontSize = fontSize;
    if (compactMode !== undefined) updateData.displaySettings.compactMode = compactMode;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'display', changes: updateData.displaySettings },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Display settings updated',
      data: settings,
    });
  } catch (error) {
    console.error('Update Display Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
    });
  }
};

// @desc    Update privacy settings
// @route   PUT /api/settings/privacy
// @access  Private
exports.updatePrivacySettings = async (req, res) => {
  try {
    const { profilePrivacy, showProgressOnLeaderboard, allowDataSharing } = req.body;

    const updateData = { 'privacySettings': {} };
    if (profilePrivacy) updateData.privacySettings.profilePrivacy = profilePrivacy;
    if (showProgressOnLeaderboard !== undefined) updateData.privacySettings.showProgressOnLeaderboard = showProgressOnLeaderboard;
    if (allowDataSharing !== undefined) updateData.privacySettings.allowDataSharing = allowDataSharing;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { ...updateData },
      { new: true, upsert: true }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { settingType: 'privacy', changes: updateData.privacySettings },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated',
      data: settings,
    });
  } catch (error) {
    console.error('Update Privacy Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
    });
  }
};

// @desc    Reset all settings to default
// @route   POST /api/settings/reset
// @access  Private
exports.resetSettings = async (req, res) => {
  try {
    await Settings.findOneAndDelete({ userId: req.user.id });
    const settings = await Settings.create({ userId: req.user.id });

    await AuditLog.create({
      userId: req.user.id,
      action: 'settings_update',
      resourceType: 'Settings',
      status: 'success',
      details: { action: 'reset_to_default' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Settings reset to default',
      data: settings,
    });
  } catch (error) {
    console.error('Reset Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting settings',
    });
  }
};
