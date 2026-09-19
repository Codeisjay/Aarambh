// ReportView.jsx
import { Download, Share2, ArrowLeft, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Panel from '../components/Panel';
import MetricBox from '../components/MetricBox';
import { reportAPI } from '../services/endpoints';

export default function ReportView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    reportAPI.getReportById(id)
      .then((response) => setReport(response.data.data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Could not load this report'));
  }, [id]);

  if (error) return <Panel><p className="text-red-400">{error}</p></Panel>;
  if (!report) return <Panel><p className="text-slate-400">Loading report...</p></Panel>;

  const overallScore = Math.round(report.overallScore || 0);
  const sessionAudit = report.sessionAudit || {};
  const strengths = [...new Set([...(report.strengths || []), ...(sessionAudit.strengths || [])])];
  const weaknesses = [...new Set([...(report.areasForImprovement || []), ...(sessionAudit.weaknesses || [])])];
  const session = report.sessionId && typeof report.sessionId === 'object' ? report.sessionId : {};
  const duration = Number(session.duration || 0);

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
      <motion.button
        onClick={() => navigate('/reports')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6 transition"
        whileHover={{ x: -5 }}
      >
        <ArrowLeft size={20} />
        Back to Reports
      </motion.button>

      {/* Overall Score */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Panel className="mb-6">
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center"
            >
              <motion.div
                className="relative w-40 h-40"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="4" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="4"
                    strokeDasharray={`${282 * (overallScore / 100)} 282`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <p className="text-4xl font-bold text-cyan-400">{overallScore}</p>
                  <p className="text-sm text-slate-400">/100</p>
                </div>
              </motion.div>
              <motion.p
                className="mt-4 text-xl font-semibold"
                variants={itemVariants}
              >
                Excellent Performance
              </motion.p>
            </motion.div>

            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <MetricBox label="Confidence" value={`${Math.round(report.confidenceScore || 0)}%`} good />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricBox label="Communication" value={`${Math.round(report.communicationScore ?? report.contentScore ?? 0)}%`} good />
              </motion.div>
              <motion.div variants={itemVariants}>
                <MetricBox label="Content Quality" value={`${Math.round(report.contentQualityScore ?? report.contentAnalysis?.relevanceScore ?? 0)}%`} good />
              </motion.div>
            </motion.div>
          </motion.div>
        </Panel>
      </motion.div>

      {/* Section Scores */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <motion.div variants={itemVariants}>
          <Panel>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-400" size={20} />
              Strengths
            </h2>
            <ul className="space-y-2">
              {strengths.map((strength, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="text-green-400 text-sm"
                >
                  ✓ {strength}
                </motion.li>
              ))}
            </ul>
          </Panel>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Panel>
            <h2 className="text-lg font-semibold mb-4">Areas to Improve</h2>
            <ul className="space-y-2">
              {weaknesses.map((weakness, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-yellow-400 text-sm"
                >
                  ⚠ {weakness}
                </motion.li>
              ))}
            </ul>
          </Panel>
        </motion.div>
      </motion.div>

      {/* Session Summary */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
        <Panel>
          <h2 className="text-lg font-semibold mb-4">Session Summary</h2>
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {[
              { label: 'Duration', value: `${Math.floor(duration / 60)}m ${duration % 60}s` },
              { label: 'Pace', value: report.speechAnalysis?.paceSummary || 'Not recorded' },
              { label: 'Fillers', value: report.speechAnalysis?.fillerCount ?? 0 },
              { label: 'Date', value: new Date(report.createdAt).toLocaleDateString() },
            ].map((item, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="font-semibold">{item.value}</p>
              </motion.div>
            ))}
          </motion.div>
        </Panel>
      </motion.div>

      <motion.div className="mt-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.45 }}>
        <Panel>
          <h2 className="text-lg font-semibold mb-4">Session Audit</h2>
          <p className="text-sm text-slate-400 mb-4">
            {sessionAudit.totalSnapshots || 0} live observations were reviewed from this session.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(sessionAudit.observations || []).map((observation, index) => (
              <div key={`${observation.metric}-${observation.timestamp}-${index}`} className="flex items-start justify-between gap-4 border-b border-slate-800 py-2 text-sm">
                <div>
                  <p className={observation.status === 'strength' ? 'text-green-400' : 'text-red-400'}>{observation.feedback}</p>
                  <p className="text-xs text-slate-500">{observation.category} / {observation.metric}</p>
                </div>
                <span className="text-slate-300">{Math.round(observation.value || 0)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </motion.div>

      {report.structuredCoaching && (
        <motion.div className="mt-6" variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: 0.48 }}>
          <Panel>
            <h2 className="text-lg font-semibold mb-4">Structured AI Coaching</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <MetricBox label="Technical Accuracy" value={`${Math.round(report.structuredCoaching.technicalAccuracy || 0)}%`} good />
              <MetricBox label="Completeness" value={`${Math.round(report.structuredCoaching.completeness || 0)}%`} good />
              <MetricBox label="Answer Quality" value={`${Math.round(report.structuredCoaching.answerQuality || 0)}%`} good />
            </div>
            <p className="text-slate-300 mb-4">{report.structuredCoaching.coaching}</p>
            {report.structuredCoaching.missingConcepts?.length > 0 && (
              <p className="text-amber-300 text-sm mb-3">Missing concepts: {report.structuredCoaching.missingConcepts.join(', ')}</p>
            )}
            {report.structuredCoaching.weaknesses?.length > 0 && (
              <ul className="space-y-1 text-red-300 text-sm mb-3">
                {report.structuredCoaching.weaknesses.map((weakness, index) => <li key={index}>- {weakness}</li>)}
              </ul>
            )}
            {report.structuredCoaching.improvedAnswer && (
              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Improved Answer</p>
                <p className="text-slate-300 text-sm">{report.structuredCoaching.improvedAnswer}</p>
              </div>
            )}
          </Panel>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        className="mt-6 flex flex-col sm:flex-row gap-4 justify-end"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
        >
          <Share2 size={18} />
          Share
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
        >
          <Download size={18} />
          Download PDF
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
