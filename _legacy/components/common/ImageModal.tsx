import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ImageModal: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => (
    <AnimatePresence>
        {src && (
            <motion.div 
                className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4" 
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.img 
                    src={src} 
                    alt="Preview" 
                    className="max-w-full max-h-full rounded-lg shadow-2xl" 
                    onClick={e => e.stopPropagation()}
                    layoutId={`image-${src}`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                />
            </motion.div>
        )}
    </AnimatePresence>
);

export default ImageModal;
