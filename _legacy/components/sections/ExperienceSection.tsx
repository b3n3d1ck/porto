import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Section from '../layout/Section';
import { experienceData } from '../../data/constants';
import type { Experience } from '../../types';
import { containerVariants, itemVariants } from '../../utils/animations';

const ExperienceDetail: React.FC<{ item: Experience, onImageClick: (src: string) => void }> = ({ item, onImageClick }) => {
  // Safely get images, defaulting to an empty array if none exist
  const images = item.images || (item.image ? [item.image] : []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
        <div className="text-sm text-[var(--text-secondary)] mb-4">{item.meta}</div>
        {item.description && <p className="text-base leading-relaxed mb-4">{item.description}</p>}
        {images.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {images.map((img, i) => (
              <motion.div 
                key={i} 
                className="relative group rounded-md overflow-hidden cursor-pointer" 
                onClick={() => onImageClick(img)} 
                layoutId={`image-${img}`}
                whileHover={{y: -4}}
              >
                <img src={img} alt={`${item.title} ${i + 1}`} className="w-40 h-28 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};


const ExperienceSection: React.FC<{ onImageClick: (src: string) => void; }> = ({ onImageClick }) => {
    const [selected, setSelected] = useState(0);
    const [mobileSelected, setMobileSelected] = useState<number | null>(null);
    
    const selectedItem = experienceData && experienceData.length > selected ? experienceData[selected] : null;

    return (
        <Section id="experience">
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="w-full"
            >
                <motion.h2 variants={itemVariants} className="font-mono text-3xl md:text-5xl text-center font-bold mb-16">Career Journey</motion.h2>
                
                {/* Desktop View */}
                <div className="hidden lg:grid grid-cols-3 gap-12 max-w-6xl mx-auto">
                    <motion.div variants={itemVariants} className="col-span-1">
                        <ul className="space-y-2">
                           {experienceData.map((item, index) => (
                                <li key={item.title} className="relative">
                                    <button 
                                        onClick={() => setSelected(index)}
                                        className={`w-full text-left p-4 rounded-lg transition-colors duration-300 ${selected !== index ? 'hover:bg-white/5' : ''}`}
                                    >
                                        <span className={`font-semibold ${selected === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                                    </button>
                                     {selected === index && (
                                        <motion.div 
                                            className="absolute top-0 bottom-0 left-0 bg-[var(--glow-color)] border-l-2 border-[var(--accent-primary)] rounded-lg -z-10"
                                            layoutId="underline"
                                        />
                                    )}
                                </li>
                           ))}
                        </ul>
                    </motion.div>
                    <motion.div variants={itemVariants} className="col-span-2 glassy rounded-2xl p-8 min-h-[24rem]">
                         {selectedItem && <ExperienceDetail item={selectedItem} onImageClick={onImageClick} />}
                    </motion.div>
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden space-y-4 max-w-xl mx-auto">
                    {experienceData.map((item, index) => (
                        <motion.div key={item.title} variants={itemVariants} layout>
                             <motion.div
                                layout
                                onClick={() => setMobileSelected(mobileSelected === index ? null : index)}
                                className="glassy p-4 rounded-xl flex justify-between items-center cursor-pointer"
                            >
                                <h3 className="text-md font-semibold">{item.title}</h3>
                                <motion.div animate={{ rotate: mobileSelected === index ? 180 : 0 }}>
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </motion.div>
                            </motion.div>
                            <AnimatePresence>
                                {mobileSelected === index && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4">
                                            <ExperienceDetail item={item} onImageClick={onImageClick} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </Section>
    );
};

export default ExperienceSection;