// Settings.jsx
import { Bell, Lock, Eye, Database, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Panel from '../components/Panel';
import { settingsAPI } from '../services/endpoints';

export default function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    feedbackAlerts: true,
    dataCollection: false,
    eyeContactThreshold: 75,
    fillerThreshold: 5,
    wpmThreshold: 90,
    pauseThreshold: 3,
    blinkThreshold: 25,
  });

  useEffect(() => {
    settingsAPI.getSettings()
      .then((response) => {
        const data = response.data?.data || {};
        setSettings((prev) => ({
          ...prev,
          emailNotifications: data.notificationSettings?.emailNotifications ?? prev.emailNotifications,
          feedbackAlerts: data.notificationSettings?.newReportNotification ?? prev.feedbackAlerts,
          dataCollection: data.privacySettings?.allowDataSharing ?? prev.dataCollection,
          eyeContactThreshold: data.aiThresholds?.eyeContactThreshold ?? prev.eyeContactThreshold,
          fillerThreshold: data.aiThresholds?.fillerThreshold ?? prev.fillerThreshold,
          wpmThreshold: data.aiThresholds?.wpmThreshold ?? prev.wpmThreshold,
          pauseThreshold: data.aiThresholds?.pauseThreshold ?? prev.pauseThreshold,
          blinkThreshold: data.aiThresholds?.blinkThreshold ?? prev.blinkThreshold,
        }));
      })
      .catch(() => undefined);
  }, []);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateThreshold = (key, value) => {
    const nextValue = Number(value);
    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    settingsAPI.updateAiThresholds({
      eyeContactThreshold: key === 'eyeContactThreshold' ? nextValue : settings.eyeContactThreshold,
      fillerThreshold: key === 'fillerThreshold' ? nextValue : settings.fillerThreshold,
      wpmThreshold: key === 'wpmThreshold' ? nextValue : settings.wpmThreshold,
      pauseThreshold: key === 'pauseThreshold' ? nextValue : settings.pauseThreshold,
      blinkThreshold: key === 'blinkThreshold' ? nextValue : settings.blinkThreshold,
    }).catch(() => undefined);
  };

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

  const categories = [
    {
      icon: Bell,
      title: 'Notifications',
      items: [
        { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates' },
        { key: 'feedbackAlerts', label: 'Feedback Alerts', desc: 'Real-time interview alerts' },
      ]
    },
    {
      icon: Gauge,
      title: 'AI Thresholds',
      items: [
        { key: 'eyeContactThreshold', label: 'Eye Contact Threshold', desc: 'Target minimum eye-contact score', type: 'number' },
        { key: 'fillerThreshold', label: 'Filler Threshold', desc: 'Alert if filler words exceed this count', type: 'number' },
        { key: 'wpmThreshold', label: 'WPM Threshold', desc: 'Minimum good pace threshold', type: 'number' },
        { key: 'pauseThreshold', label: 'Pause Threshold', desc: 'Seconds before warning', type: 'number' },
        { key: 'blinkThreshold', label: 'Blink Threshold', desc: 'Upper acceptable blink rate', type: 'number' },
      ]
    },
    {
      icon: Lock,
      title: 'Privacy & Security',
      items: [
        { key: 'dataCollection', label: 'Data Collection', desc: 'Allow usage analytics' },
      ]
    },
  ];

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {categories.map((category, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Panel>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                <category.icon className="text-cyan-400" size={24} />
                <h2 className="text-lg font-semibold">{category.title}</h2>
              </div>

              <div className="space-y-4">
                {category.items.map(item => (
                  <motion.div
                    key={item.key}
                    whileHover={{ x: 5 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                    {item.type === 'number' ? (
                      <input
                        type="number"
                        value={settings[item.key] ?? 0}
                        onChange={(event) => updateThreshold(item.key, event.target.value)}
                        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    ) : (
                      <motion.button
                        onClick={() => toggleSetting(item.key)}
                        className={`w-14 h-8 rounded-full transition ${
                          settings[item.key] ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <motion.div
                          className={`w-6 h-6 rounded-full bg-white transition ${
                            settings[item.key] ? 'translate-x-7' : 'translate-x-1'
                          }`}
                          layout
                        />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>
            </Panel>
          </motion.div>
        ))}

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Panel>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                <Eye className="text-red-400" size={24} />
                <h2 className="text-lg font-semibold">Danger Zone</h2>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-red-900/30 border border-red-700 hover:bg-red-900/50 text-red-400 px-4 py-3 rounded-lg transition"
              >
                Change Password
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-red-900/30 border border-red-700 hover:bg-red-900/50 text-red-400 px-4 py-3 rounded-lg transition"
              >
                Delete Account
              </motion.button>
            </div>
          </Panel>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
