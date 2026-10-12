const User = require('../models/User');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    console.log('📥 [GET /users/me] Fetching profile for user:', req.user.id);
    
    const user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('✅ Profile returned:', user.email);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, bio, jobTitle, company, location, avatar } = req.body;
    
    console.log('📝 [PUT /users/profile] Updating profile for user:', req.user.id);
    console.log('📦 Data received:', { firstName, lastName, phone, bio, jobTitle, company, location, avatar });

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (jobTitle) updateData.jobTitle = jobTitle;
    if (company) updateData.company = company;
    if (location) updateData.location = location;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      console.log('❌ User not found for update:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('✅ Profile updated successfully:', user.email);

    await AuditLog.create({
      userId: req.user.id,
      action: 'profile_update',
      resourceType: 'User',
      resourceId: user._id.toString(),
      status: 'success',
      details: updateData,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isPasswordMatched = await user.matchPassword(currentPassword);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    await AuditLog.create({
      userId: req.user.id,
      action: 'password_reset',
      resourceType: 'User',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
    });
  }
};

// @desc    Get user by ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
};

// @desc    Update user status (Admin)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_user_action',
      resourceType: 'User',
      resourceId: user._id.toString(),
      status: 'success',
      details: { action: 'status_update', newStatus: status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update User Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
    });
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_user_action',
      resourceType: 'User',
      resourceId: req.params.id,
      status: 'success',
      details: { action: 'user_deleted' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // In a real application, you would aggregate data from sessions, reports, etc.
    res.status(200).json({
      success: true,
      data: {
        totalSessions: user.totalSessions,
        completedSessions: user.completedSessions,
        averageScore: user.averageScore,
        lastSessionDate: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get User Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
    });
  }
};

// @desc    Get statistics for the authenticated user
// @route   GET /api/users/me/stats
// @access  Private
exports.getCurrentUserStats = async (req, res) => {
  try {
    const [summary] = await Session.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalDuration: { $sum: '$duration' },
          averageScore: {
            $avg: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$overallScore', null],
            },
          },
          lastSessionDate: { $max: '$updatedAt' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSessions: summary?.totalSessions || 0,
        completedSessions: summary?.completedSessions || 0,
        totalDuration: summary?.totalDuration || 0,
        averageScore: summary?.averageScore || 0,
        lastSessionDate: summary?.lastSessionDate || null,
      },
    });
  } catch (error) {
    console.error('Get Current User Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics',
    });
  }
};
