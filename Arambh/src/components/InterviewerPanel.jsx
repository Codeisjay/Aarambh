import { motion } from 'framer-motion';
import { Bot, Volume2 } from 'lucide-react';

export default function InterviewerPanel({ isSpeaking = false, isPaused = false, isSessionEnded = false }) {
  const isActive = isSpeaking && !isPaused && !isSessionEnded;

  return (
    <div className="flex h-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <span className="rounded-full border border-cyan-700 bg-cyan-950/60 px-4 py-1 text-sm text-cyan-300">
          AI Interviewer
        </span>
        <span className={`flex items-center gap-1 text-xs ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}>
          <Volume2 size={14} />
          {isActive ? 'Speaking' : isSessionEnded ? 'Session ended' : 'Ready'}
        </span>
      </div>

      <div className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-[#102b3d] via-[#0b1728] to-[#101a30] ${isActive ? 'border-cyan-400/80' : 'border-slate-800'}`}>
        <motion.div
          className="absolute h-40 w-40 rounded-full border border-cyan-400/20"
          animate={isActive ? { scale: [1, 1.12, 1], opacity: [0.25, 0.55, 0.25] } : { scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.6, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-cyan-300/70 bg-cyan-950 text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
          animate={isActive ? { y: [0, -4, 0] } : { y: 0 }}
          transition={{ duration: 1.2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
        >
          <Bot size={58} strokeWidth={1.4} />
          {isActive && (
            <motion.span
              className="absolute bottom-5 h-2 w-5 rounded-full bg-cyan-300"
              animate={{ scaleX: [0.65, 1.2, 0.65], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>

        {isActive && (
          <div className="absolute bottom-4 flex items-end gap-1" aria-label="Interviewer is speaking">
            {[10, 18, 13, 22, 15].map((height, index) => (
              <motion.span
                key={height}
                className="w-1 rounded-full bg-cyan-300"
                animate={{ height: [height / 2, height, height / 2] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: index * 0.08, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-300">
        {isActive ? 'Interviewer is speaking...' : 'Interviewer'}
      </p>
    </div>
  );
}
