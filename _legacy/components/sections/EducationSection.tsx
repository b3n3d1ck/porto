import React from 'react';
import { motion } from 'framer-motion';
import Section from '../layout/Section';
import { educationData } from '../../data/constants';
import type { Education } from '../../types';
import { containerVariants, itemVariants } from '../../utils/animations';

const EducationCard: React.FC<{ item: Education }> = ({ item }) => (
    <motion.div 
        className="glassy rounded-2xl p-6 flex flex-col items-start gap-4"
        variants={itemVariants}
        whileHover={{
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 10px 30px -10px var(--glow-color)'
        }}
    >
        <div className="w-16 h-16 bg-white/10 p-2 rounded-lg flex items-center justify-center">
             <img src={item.logo} alt={`${item.title} logo`} className="object-contain max-w-full max-h-full" />
        </div>
        <div className="flex-grow">
            <h3 className="text-lg font-bold">{item.title}</h3>
            <p className="text-[var(--text-secondary)] text-sm">{item.meta}</p>
        </div>
    </motion.div>
);

const EducationSection: React.FC = () => {
    return (
        <Section id="education">
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="w-full"
            >
                <motion.h2 variants={itemVariants} className="font-mono text-3xl md:text-5xl text-center font-bold mb-16">Education</motion.h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {educationData.map((item, index) => <EducationCard key={index} item={item} />)}
                </div>
            </motion.div>
        </Section>
    );
};

export default EducationSection;