import { useEffect, useRef } from 'react';
import { motion, animate } from 'motion/react';
import clsx from 'clsx';

interface ScoreCardProps {
  points: number;
  label?: string;
  className?: string;
}

export function ScoreCard({ points, label = "POINTS", className }: ScoreCardProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const currentVal = parseInt(node.textContent || "0");
      const controls = animate(currentVal, points, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(value) {
          node.textContent = Math.round(value).toString();
        }
      });
      return () => controls.stop();
    }
  }, [points]);

  return (
    <div className={clsx("flex flex-col items-center justify-center p-8 rounded-3xl bg-surface border border-white/5 shadow-2xl relative overflow-hidden", className)}>
      {/* Subtle glow effect behind the number */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-40 h-40 bg-primary rounded-full blur-3xl"></div>
      </div>
      
      <motion.span 
        ref={nodeRef}
        className="font-display text-7xl md:text-8xl text-primary drop-shadow-[0_0_15px_rgba(255,193,7,0.5)] z-10"
      >
        {points}
      </motion.span>
      <span className="font-sans font-bold text-white/50 tracking-widest uppercase text-sm mt-2 z-10">
        {label}
      </span>
    </div>
  );
}
