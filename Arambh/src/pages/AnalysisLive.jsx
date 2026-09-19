// AnalysisLive.jsx
import { motion } from 'framer-motion';
import Panel from '../components/Panel';
import MetricBox from '../components/MetricBox';
import FeedbackRow from '../components/FeedbackRow';
import LiveWarnings from '../components/LiveWarnings';
import ConfidenceTimeline from '../components/ConfidenceTimeline';
import { useLiveMetrics } from '../hooks/useLiveMetrics';

export default function AnalysisLive() {
  const { wpm, fillerWords, clarity, eyeContact, blinkScore, headStability, overallConfidence, feedback, warnings } = useLiveMetrics();

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
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Panel>
            <h2 className="font-semibold mb-4">Speech Metrics</h2>
            <MetricBox label="Words Per Minute" value={`${wpm || 0} WPM`} good={wpm >= 90 && wpm <= 150} warn={wpm > 150 || wpm < 90} />
            <MetricBox label="Filler Words" value={fillerWords || 0} warn={Number(fillerWords) > 0} />
            <MetricBox label="Clarity" value={`${clarity || 0}%`} good={clarity >= 70} warn={clarity < 70} />
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel>
            <h2 className="font-semibold mb-4">Behavior Metrics</h2>
            <MetricBox label="Eye Contact" value={`${eyeContact || 0}%`} good={eyeContact >= 75} warn={eyeContact < 75} />
            <MetricBox label="Blink Score" value={`${blinkScore || 0}%`} good={blinkScore >= 60} warn={blinkScore < 60} />
            <MetricBox label="Head Stability" value={`${headStability || 0}%`} good={headStability >= 80} warn={headStability < 80} />
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel>
            <h2 className="font-semibold mb-4">Analysis Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">Processing</p>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-600"
                    animate={{ width: `${Math.min(100, overallConfidence || 0)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <p className="text-slate-300">Overall confidence: {overallConfidence || 0}%</p>
            </div>
          </Panel>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
        <Panel>
          <h2 className="font-semibold mb-4">Real-Time Feedback</h2>
          <div className="space-y-3 mb-6">
            {feedback && feedback.length > 0 ? (
              feedback.slice(0, 4).map((item, index) => (
                <FeedbackRow key={`${item.text}-${index}`} text={item.text || item} type={item.type || 'info'} />
              ))
            ) : (
              <FeedbackRow text="Waiting for live AI evaluation..." type="info" />
            )}
          </div>
          <div className="mb-4">
            <h3 className="text-sm text-slate-400 mb-2">Live Warnings</h3>
            <LiveWarnings warnings={warnings} feedback={feedback} />
          </div>
          <ConfidenceTimeline data={feedback.map((item, index) => ({ label: `t${index + 1}`, score: overallConfidence || 0 }))} />
        </Panel>
      </motion.div>
    </motion.div>
  );
}
