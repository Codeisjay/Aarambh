// AdminDashboard.jsx
import { Users, BookOpen, BarChart3, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Panel from '../components/Panel';
import { adminAPI } from '../services/endpoints';

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    totalSessions: 0,
    averageUserScore: 0,
    activeUsers: 0,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await adminAPI.getDashboard();
        const dashboard = response.data?.data;
        setStatistics(dashboard?.statistics || {});
        setRecentSessions(dashboard?.recentSessions || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = [
    { icon: Users, label: 'Total Users', value: statistics.totalUsers, color: 'text-cyan-400' },
    { icon: BookOpen, label: 'Total Sessions', value: statistics.totalSessions, color: 'text-green-400' },
    { icon: BarChart3, label: 'Avg Score', value: Number(statistics.averageUserScore || 0).toFixed(1), color: 'text-yellow-400' },
    { icon: TrendingUp, label: 'Active Users', value: statistics.activeUsers, color: 'text-blue-400' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Admin Dashboard
      </motion.h1>

      {/* KPI Cards */}
      {error && <p className="mb-6 text-red-400">{error}</p>}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Panel>
              <motion.div
                className="flex items-center justify-between"
                whileHover={{ y: -5 }}
              >
                <div>
                  <p className="text-slate-400 text-sm mb-2">{stat.label}</p>
                  <motion.p
                    className="text-3xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    {isLoading ? '...' : stat.value}
                  </motion.p>
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <stat.icon className={stat.color} size={32} />
                </motion.div>
              </motion.div>
            </Panel>
          </motion.div>
        ))}
      </motion.div>

      {/* System Health */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
        <Panel>
          <h2 className="text-lg font-semibold mb-6">System Health</h2>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: 'Server Status', status: 'Healthy', healthy: true },
              { label: 'Database', status: 'Optimal', healthy: true },
              { label: 'API Response', status: '45ms', healthy: true },
            ].map((item, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <p className="text-slate-400 text-sm mb-2">{item.label}</p>
                <div className="flex items-center gap-2">
                  {item.healthy && (
                    <motion.div
                      className="w-3 h-3 bg-green-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    ></motion.div>
                  )}
                  <p className="font-semibold">{item.status}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Panel>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <Panel>
          <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
          <motion.div
            className="space-y-2 text-sm text-slate-400"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {!isLoading && recentSessions.length === 0 && (
              <motion.p variants={itemVariants}>No sessions found.</motion.p>
            )}
            {recentSessions.map((session) => (
              <motion.p key={session._id} variants={itemVariants}>
                • {session.title || session.interviewType || 'Interview session'} ({session.status || 'unknown'})
              </motion.p>
            ))}
          </motion.div>
        </Panel>
      </motion.div>
    </motion.div>
  );
}
