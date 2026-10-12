// Profile.jsx - Attractive Profile Page with Animations
import { useState, useEffect } from 'react';
import { Mail, Phone, Briefcase, MapPin, Award, Clock, TrendingUp, Edit2, Save, X, User as UserIcon, Calendar, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { sessionAPI, userAPI } from '../services/endpoints';
import Panel from '../components/Panel';

export default function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    company: '',
    location: '',
    bio: '',
  });

  // Load profile data from backend on component mount
  useEffect(() => {
    loadProfileData();
    loadStats();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      console.log('📥 Fetching profile data from backend...');
      
      const response = await userAPI.getProfile();
      console.log('✅ Profile data received:', response.data);

      const userData = response.data.data;
      setProfileData(userData);
      setStats(previousStats => ({
        ...previousStats,
        memberSince: userData.createdAt
          ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : previousStats.memberSince,
      }));
      
      // Initialize form with backend data
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        jobTitle: userData.jobTitle || '',
        company: userData.company || '',
        location: userData.location || '',
        bio: userData.bio || '',
      });
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load profile. Please refresh the page.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await sessionAPI.getSessions(1, 1000, { status: 'completed' });
      const sessions = response.data.data || [];
      const totalDuration = sessions.reduce((total, session) => total + (session.duration || 0), 0);
      const scores = sessions.map(session => Number(session.overallScore || session.confidenceScore || 0));
      const averageScore = scores.length
        ? scores.reduce((total, score) => total + score, 0) / scores.length
        : 0;
      const totalMinutes = Math.floor(totalDuration / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setStats(previousStats => ({
        ...previousStats,
        totalSessions: response.data.pagination?.total ?? sessions.length,
        totalTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        avgScore: averageScore.toFixed(1),
      }));
    } catch (error) {
      console.error('Error loading profile stats:', error);
    }
  };

  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTime: '0h',
    avgScore: 0,
    memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  });

  const achievements = [
    { emoji: '🏆', title: 'Interview Master', description: 'Completed 20 interviews' },
    { emoji: '🎯', title: 'Accuracy King', description: 'Score above 80% 5 times' },
    { emoji: '⚡', title: 'Consistency Pro', description: '7 day streak' },
    { emoji: '📈', title: 'Progress Maker', description: '15% improvement' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field changed: ${name} = ${value}`);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage({ type: '', text: '' });

      console.log('💾 Saving profile with data:', formData);

      // Call API to update profile
      const response = await userAPI.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        company: formData.company,
        location: formData.location,
        bio: formData.bio,
      });

      console.log('✅ Profile saved successfully:', response.data);

      if (response.data.success) {
        // Update profile data with the response
        setProfileData(response.data.data);
        
        setMessage({
          type: 'success',
          text: 'Profile updated successfully! ✓'
        });
        setIsEditing(false);
        
        // Auto-hide message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile. Please try again.';
      console.log('Error details:', { status: error.response?.status, data: error.response?.data });
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f1b2e] to-[#0b1220] text-white p-6">
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader size={40} className="text-cyan-400" />
          </motion.div>
        </div>
      )}

      {!isLoading && profileData && (
        <>
      {/* Profile Header with Avatar */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Panel className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-cyan-700/50">
          <div className="flex flex-col md:flex-row items-center gap-8 relative">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-lg opacity-75"
                style={{ inset: '-8px' }}
              />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center border-4 border-slate-800">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl"
                >
                  {formData.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </motion.div>
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2"
              >
                {profileData.firstName} {profileData.lastName}
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2 text-slate-300"
              >
                {profileData.jobTitle && (
                  <p className="flex items-center gap-2 justify-center md:justify-start">
                    <Briefcase size={18} className="text-cyan-400" />
                    {profileData.jobTitle} {profileData.company && `at ${profileData.company}`}
                  </p>
                )}
                {profileData.location && (
                  <p className="flex items-center gap-2 justify-center md:justify-start">
                    <MapPin size={18} className="text-cyan-400" />
                    {profileData.location}
                  </p>
                )}
                {profileData.bio && (
                  <p className="text-slate-400 mt-3">{profileData.bio}</p>
                )}
              </motion.div>
            </div>

            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="absolute top-4 right-4 md:relative md:top-auto md:right-auto bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg px-4 py-2 flex items-center gap-2 transition"
            >
              <Edit2 size={18} />
              {isEditing ? 'Cancel' : 'Edit'}
            </motion.button>
          </div>
        </Panel>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Panel className="h-full hover:border-cyan-600/50 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Total Interviews</p>
                <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-lg"
              >
                <Award size={24} className="text-white" />
              </motion.div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel className="h-full hover:border-cyan-600/50 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Total Time</p>
                <p className="text-3xl font-bold text-white">{stats.totalTime}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="bg-gradient-to-br from-cyan-500 to-blue-500 p-3 rounded-lg"
              >
                <Clock size={24} className="text-white" />
              </motion.div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel className="h-full hover:border-cyan-600/50 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Avg Score</p>
                <p className="text-3xl font-bold text-white">{stats.avgScore}/100</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="bg-gradient-to-br from-green-500 to-emerald-500 p-3 rounded-lg"
              >
                <TrendingUp size={24} className="text-white" />
              </motion.div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel className="h-full hover:border-cyan-600/50 transition">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-2">Member Since</p>
                <p className="text-3xl font-bold text-white text-sm">{stats.memberSince}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-lg"
              >
                <Calendar size={24} className="text-white" />
              </motion.div>
            </div>
          </Panel>
        </motion.div>
      </motion.div>

      {/* Edit Profile Section */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Panel className="border-cyan-600/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Edit Profile</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-lg hover:bg-slate-800/50"
                disabled={isSaving}
              >
                <X size={20} className="text-slate-400" />
              </motion.button>
            </div>

            {/* Success/Error Message */}
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 mb-6 p-4 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                ) : (
                  <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                )}
                <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {message.text}
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* First Name */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Last Name */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Email */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Phone */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Job Title */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">Job Title</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Company */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm text-slate-400 mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Location */}
              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </motion.div>

              {/* Bio */}
              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition resize-none"
                />
              </motion.div>
            </div>

            <motion.button
              whileHover={{ scale: isSaving ? 1 : 1.02 }}
              whileTap={{ scale: isSaving ? 1 : 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </Panel>
        </motion.div>
      )}

      {/* Achievements Section */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold mb-6 text-white">Achievements</h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {achievements.map((achievement, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="relative"
            >
              <Panel className="h-full flex flex-col items-center text-center hover:border-cyan-600/50 transition">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                  className="text-5xl mb-3"
                >
                  {achievement.emoji}
                </motion.div>
                <h3 className="font-semibold text-lg mb-2">{achievement.title}</h3>
                <p className="text-slate-400 text-sm">{achievement.description}</p>
              </Panel>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        <Panel>
          <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Mail className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Email</p>
                <p className="text-white font-medium">{formData.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Phone className="text-cyan-400" size={24} />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Phone</p>
                <p className="text-white font-medium">{formData.phone}</p>
              </div>
            </div>
          </div>
        </Panel>
      </motion.div>
        </>
      )}
    </div>
  );
}
