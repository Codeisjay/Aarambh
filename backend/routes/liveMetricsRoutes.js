const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { receiveLiveMetrics, getLiveMetrics } = require('../controllers/liveMetricsController');

router.use(authMiddleware);
router.post('/session/:sessionId', receiveLiveMetrics);
router.get('/session/:sessionId', getLiveMetrics);

module.exports = router;
