import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const GlassCard = ({ children, className, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={twMerge(
        // Ultra-premium glassmorphism
        "relative backdrop-blur-3xl bg-white/[0.02] border border-white/[0.05] rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:to-transparent before:pointer-events-none", // Subtle top highlight
        className
      )}
    >
      {/* Optional: subtle noise or shine effect could go here */}
      {children}
    </motion.div>
  );
};

export default GlassCard;