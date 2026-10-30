import React from 'react';
import { motion } from 'framer-motion';

const AuroraBackground: React.FC = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <motion.div 
      className="absolute rounded-full filter blur-[150px] opacity-20 w-[600px] h-[600px] bg-[var(--accent-primary)] -top-1/5 -left-[10%]"
      animate={{ x: [0, 100, 0], y: [0, 150, 0], scale: [1, 1.2, 1]}}
      transition={{ duration: 25, repeat: Infinity, repeatType: "mirror" }}
    />
    <motion.div 
      className="absolute rounded-full filter blur-[150px] opacity-20 w-[500px] h-[500px] bg-[var(--accent-secondary)] -bottom-[30%] -right-1/5"
      animate={{ x: [0, -150, 0], y: [0, -100, 0], scale: [1, 0.8, 1]}}
      transition={{ duration: 30, repeat: Infinity, repeatType: "mirror" }}
    />
  </div>
);

export default AuroraBackground;
