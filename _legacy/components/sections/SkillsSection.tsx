import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Section from '../layout/Section';
import { techSkillsData } from '../../data/constants';
import { containerVariants, itemVariants } from '../../utils/animations';

const SkillsSection: React.FC = () => {
    const [activeSkill, setActiveSkill] = useState<typeof techSkillsData[0] | null>(null);
    const [hoveredSkill, setHoveredSkill] = useState(techSkillsData[0]);

    const displaySkill = hoveredSkill || activeSkill || techSkillsData[0];

    return (
        <Section id="skills">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="w-full"
            >
                <motion.h2 variants={itemVariants} className="font-mono text-3xl md:text-5xl text-center font-bold mb-16">Skills</motion.h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 items-start">
                    
                    {/* Desktop skill list */}
                    <motion.div variants={itemVariants} className="hidden lg:block lg:col-span-1 space-y-2 relative">
                        {techSkillsData.map((skill) => (
                            <div
                                key={skill.name}
                                onMouseEnter={() => setHoveredSkill(skill)}
                                className="relative p-4 rounded-lg cursor-pointer transition-colors duration-300"
                            >
                                {hoveredSkill.name === skill.name && (
                                     <motion.div
                                        layoutId="skill-glow"
                                        className="absolute inset-0 bg-[var(--glow-color)] border border-[var(--accent-primary)] rounded-lg z-0"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 text-lg font-medium">{skill.name}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* Desktop skill detail view */}
                    <motion.div variants={itemVariants} className="hidden lg:block lg:col-span-2 glassy rounded-2xl p-8">
                         <AnimatePresence mode="wait">
                            <motion.div
                                key={displaySkill.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <img src={displaySkill.icon} alt={displaySkill.name} className="w-12 h-12 object-contain" />
                                    <h3 className="text-2xl font-bold">{displaySkill.name}</h3>
                                </div>
                                <p className="text-[var(--text-secondary)] text-base leading-relaxed">{displaySkill.desc}</p>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Mobile accordion view */}
                    <div className="block lg:hidden space-y-4">
                        {techSkillsData.map((skill) => (
                            <motion.div key={skill.name} variants={itemVariants} layout>
                                <motion.div
                                    layout
                                    onClick={() => setActiveSkill(activeSkill?.name === skill.name ? null : skill)}
                                    className="glassy p-4 rounded-xl flex justify-between items-center cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                         <img src={skill.icon} alt={skill.name} className="w-8 h-8 object-contain" />
                                        <h3 className="text-lg font-medium">{skill.name}</h3>
                                    </div>
                                    <motion.div animate={{ rotate: activeSkill?.name === skill.name ? 180 : 0 }}>
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </motion.div>
                                </motion.div>
                                <AnimatePresence>
                                {activeSkill?.name === skill.name && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="p-4 text-[var(--text-secondary)] text-sm">{skill.desc}</p>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </Section>
    );
};

export default SkillsSection;