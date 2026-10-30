import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeToggle: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`fixed z-[1000] flex items-center justify-center glassy cursor-pointer
      top-[80px] right-4 w-14 h-8 rounded-full
      md:top-8 md:right-8 md:w-16 md:h-9`}
      aria-label="Toggle theme"
    >
      <div className={`relative w-full h-full flex items-center px-1.5 ${isDark ? 'justify-end' : 'justify-start'}`}>
        <AnimatePresence>
            {!isDark && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                    <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                </motion.div>
            )}
        </AnimatePresence>
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 30 }}
          className="absolute w-6 h-6 rounded-full bg-white/80 dark:bg-slate-600/80"
        />
        <AnimatePresence>
            {isDark && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                    <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </button>
  );
};

export default ThemeToggle;
