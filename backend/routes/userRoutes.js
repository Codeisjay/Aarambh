const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getUserStats,
  getCurrentUserStats,
} = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Protected routes (all require authentication)
router.use(authMiddleware);

// User profile routes
router.get('/me', getProfile);
router.get('/me/stats', getCurrentUserStats);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/:id/stats', getUserStats);

// Admin only routes
router.get('/', adminMiddleware, getAllUsers);
router.get('/:id', adminMiddleware, getUserById);
router.put('/:id/status', adminMiddleware, updateUserStatus);
router.delete('/:id', adminMiddleware, deleteUser);

module.exports = router;
