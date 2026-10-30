import React from 'react';
import { motion } from 'framer-motion';
import Section from '../layout/Section';
import { personalData } from '../../data/constants';
import { useScrambleText } from '../../hooks/useScrambleText';
import { containerVariants, itemVariants } from '../../utils/animations';

const HomeSection: React.FC = () => {
    const [scrambleRef, jobText] = useScrambleText(personalData.job);

    return (
        <Section id="home">
            <div className="text-center">
                <h1 className="font-mono text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold">
                    <span className="light-sweep-text" style={{ animation: 'framerMotionEntrance 2.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards, sweep 4s infinite 3s' }}>
                        {personalData.name}
                    </span>
                </h1>
                <p ref={scrambleRef} className="text-base md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto mt-4 h-24">{jobText}</p>
                <motion.div className="flex justify-center gap-8 mt-10" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                    {personalData.socials.map(social => (
                        <motion.a 
                            key={social.name} 
                            href={social.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" 
                            title={social.name} 
                            dangerouslySetInnerHTML={{ __html: social.icon }}
                            variants={itemVariants}
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                        />
                    ))}
                </motion.div>
            </div>
        </Section>
    );
};

export default HomeSection;