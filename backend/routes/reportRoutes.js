const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReports,
  getReportById,
  downloadReport,
  deleteReport,
} = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Reports
router.post('/generate/:sessionId', generateReport);
router.get('/', getReports);
router.get('/:id/download', downloadReport);
router.get('/:id', getReportById);
router.delete('/:id', deleteReport);

module.exports = router;
