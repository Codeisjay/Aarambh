// API Service for all endpoints
import api from './api';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:5100';

export const aiAPI = {
  transcribeAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview.webm');
    const response = await fetch(`${AI_SERVICE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`Whisper transcription failed (${response.status})`);
    return response.json();
  },
};

// ============= AUTH ENDPOINTS =============
export const authAPI = {
  signup: (firstName, lastName, email, password, confirmPassword) =>
    api.post('/auth/signup', { firstName, lastName, email, password, confirmPassword }),
  
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (resetToken, password) =>
    api.post(`/auth/reset-password/${resetToken}`, { password }),
};

// ============= USER PROFILE ENDPOINTS =============
export const userAPI = {
  getProfile: () =>
    api.get('/users/me'),
  
  updateProfile: (profileData) =>
    api.put('/users/profile', profileData),
  
  changePassword: (currentPassword, newPassword) =>
    api.put('/users/change-password', { currentPassword, newPassword }),
  
  getUserStats: () =>
    api.get('/users/me/stats'),
  
  // Admin endpoints
  getAllUsers: (page = 1, limit = 10) =>
    api.get(`/users?page=${page}&limit=${limit}`),
  
  getUserById: (userId) =>
    api.get(`/users/${userId}`),
  
  updateUserStatus: (userId, status) =>
    api.put(`/users/${userId}/status`, { status }),
  
  deleteUser: (userId) =>
    api.delete(`/users/${userId}`),
};

// ============= SETTINGS ENDPOINTS =============
export const settingsAPI = {
  getSettings: () =>
    api.get('/settings'),
  
  updateInterviewSettings: (settings) =>
    api.put('/settings/interview', settings),

  updateAiThresholds: (thresholds) =>
    api.put('/settings/ai-thresholds', thresholds),
  
  updateMediaSettings: (settings) =>
    api.put('/settings/media', settings),
  
  updateNotificationSettings: (settings) =>
    api.put('/settings/notifications', settings),
  
  updateDisplaySettings: (settings) =>
    api.put('/settings/display', settings),
  
  updatePrivacySettings: (settings) =>
    api.put('/settings/privacy', settings),
  
  resetSettings: () =>
    api.post('/settings/reset'),
};

// ============= SESSION ENDPOINTS =============
export const sessionAPI = {
  createSession: (sessionData) =>
    api.post('/sessions', sessionData),
  
  getSessions: (page = 1, limit = 10, filters = {}) =>
    api.get(`/sessions?page=${page}&limit=${limit}`, { params: filters }),
  
  getSessionById: (sessionId) =>
    api.get(`/sessions/${sessionId}`),
  
  startSession: (sessionId) =>
    api.put(`/sessions/${sessionId}/start`),
  
  pauseSession: (sessionId) =>
    api.put(`/sessions/${sessionId}/pause`),
  
  resumeSession: (sessionId) =>
    api.put(`/sessions/${sessionId}/resume`),
  
  completeSession: (sessionId, completionData) =>
    api.put(`/sessions/${sessionId}/complete`, completionData),
  
  cancelSession: (sessionId, reason = '') =>
    api.put(`/sessions/${sessionId}/cancel`, { reason }),
  
  deleteSession: (sessionId) =>
    api.delete(`/sessions/${sessionId}`),
  
  addSessionNote: (sessionId, note) =>
    api.post(`/sessions/${sessionId}/notes`, { note }),
};

// ============= METRICS ENDPOINTS =============
export const metricsAPI = {
  // Speech Metrics
  updateSpeechMetrics: (sessionId, metricsData) =>
    api.post(`/metrics/speech/${sessionId}`, metricsData),
  
  getSpeechMetrics: (sessionId) =>
    api.get(`/metrics/speech/${sessionId}`),
  
  addSpeechInsight: (sessionId, insight) =>
    api.post(`/metrics/speech/${sessionId}/insights`, insight),
  
  // Confidence Metrics
  updateConfidenceMetrics: (sessionId, metricsData) =>
    api.post(`/metrics/confidence/${sessionId}`, metricsData),
  
  getConfidenceMetrics: (sessionId) =>
    api.get(`/metrics/confidence/${sessionId}`),
  
  addConfidenceInsight: (sessionId, insight) =>
    api.post(`/metrics/confidence/${sessionId}/insights`, insight),
  
  addConfidenceTimeline: (sessionId, timelineData) =>
    api.post(`/metrics/confidence/${sessionId}/timeline`, timelineData),
  
  // Summary
  getMetricsSummary: (sessionId) =>
    api.get(`/metrics/summary/${sessionId}`),
};

// ============= REPORT ENDPOINTS =============
export const reportAPI = {
  generateReport: (sessionId) =>
    api.post(`/reports/generate/${sessionId}`),
  
  getReports: (page = 1, limit = 10) =>
    api.get(`/reports?page=${page}&limit=${limit}`),
  
  getReportById: (reportId) =>
    api.get(`/reports/${reportId}`),
  
  deleteReport: (reportId) =>
    api.delete(`/reports/${reportId}`),
};

// ============= ADMIN ENDPOINTS =============
export const adminAPI = {
  getDashboard: () =>
    api.get('/admin/dashboard'),
  
  getAllUsers: (page = 1, limit = 10) =>
    api.get(`/admin/users?page=${page}&limit=${limit}`),
  
  getUserDetails: (userId) =>
    api.get(`/admin/users/${userId}`),
  
  updateUserRole: (userId, role) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  
  getAllSessions: (page = 1, limit = 10) =>
    api.get(`/admin/sessions?page=${page}&limit=${limit}`),
  
  getSessionDetails: (sessionId) =>
    api.get(`/admin/sessions/${sessionId}`),
  
  deleteSession: (sessionId) =>
    api.delete(`/admin/sessions/${sessionId}`),
  
  getAllReports: (page = 1, limit = 10) =>
    api.get(`/admin/reports?page=${page}&limit=${limit}`),
  
  getAnalytics: (startDate, endDate) =>
    api.get(`/admin/analytics?startDate=${startDate}&endDate=${endDate}`),
  
  getAuditLogs: (page = 1, limit = 20) =>
    api.get(`/admin/audit-logs?page=${page}&limit=${limit}`),
};

export default {
  authAPI,
  userAPI,
  settingsAPI,
  sessionAPI,
  metricsAPI,
  reportAPI,
  adminAPI,
};
