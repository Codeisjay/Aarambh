import { motion } from 'framer-motion';

export default function EyeContactMeter({ percent = 0 }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const color = safePercent >= 75 ? 'bg-green-400' : safePercent >= 55 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="space-y-3">
      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${safePercent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className="text-sm text-slate-300">Eye contact: {safePercent}%</div>
    </div>
  );
}
