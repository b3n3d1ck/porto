import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ScreenshotOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => (
    <AnimatePresence>
        {isVisible && (
            <motion.div 
                className="fixed inset-0 z-[5000] flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] text-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div 
                    className="w-full max-w-2xl p-10 rounded-2xl bg-black/20 backdrop-blur-md"
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.7 }}
                >
                    <h2 className="m-0 mb-2 text-xl md:text-3xl">mau ngapain bos?</h2>
                    <p className="m-0 text-sm md:text-base text-[var(--text-secondary)]">Halaman ini dilindungi, jika ingin kepo/nyuri kode, mikir pakai dengkul.</p>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default ScreenshotOverlay;
