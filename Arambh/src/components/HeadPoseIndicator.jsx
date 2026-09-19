import { motion } from 'framer-motion';

export default function HeadPoseIndicator({ stability = 0 }) {
  const safePercent = Math.max(0, Math.min(100, Number(stability) || 0));
  const label = safePercent >= 80 ? 'Stable' : safePercent >= 60 ? 'Moderate' : 'Unstable';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>Head Stability</span>
        <span>{label}</span>
      </div>
      <motion.div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-cyan-400"
          initial={{ width: 0 }}
          animate={{ width: `${safePercent}%` }}
          transition={{ duration: 0.4 }}
        />
      </motion.div>
    </div>
  );
}
