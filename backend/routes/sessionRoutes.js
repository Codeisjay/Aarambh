const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  cancelSession,
  deleteSession,
  addSessionNote,
  getNextInterviewQuestion,
} = require('../controllers/sessionController');
const authMiddleware = require('../middleware/auth');

const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    callback(null, allowedTypes.includes(file.mimetype));
  },
});

// All routes require authentication
router.use(authMiddleware);

// Session management
router.post('/', uploadCv.single('cv'), createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.post('/:id/interview/next', getNextInterviewQuestion);

// Session status operations
router.put('/:id/start', startSession);
router.put('/:id/pause', pauseSession);
router.put('/:id/resume', resumeSession);
router.put('/:id/complete', completeSession);
router.put('/:id/cancel', cancelSession);

// Session management
router.delete('/:id', deleteSession);
router.post('/:id/notes', addSessionNote);

module.exports = router;
