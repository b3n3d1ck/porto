import React from 'react';
import { motion } from 'framer-motion';
import Section from '../layout/Section';
import { personalData } from '../../data/constants';
import { containerVariants, itemVariants } from '../../utils/animations';

const ContactSection: React.FC = () => {
    return (
    <Section id="contact">
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center max-w-2xl mx-auto"
        >
            <motion.h2 variants={itemVariants} className="font-mono text-3xl md:text-5xl font-bold mb-4">Let's Connect</motion.h2>
            <motion.p variants={itemVariants} className="text-lg text-[var(--text-secondary)] mb-8">Have an idea or project? Let's talk.</motion.p>
            <motion.a 
                href={`mailto:${personalData.email}`} 
                className="contact-button glassy inline-block py-4 px-8 md:py-6 md:px-12 rounded-2xl text-lg md:text-2xl font-semibold"
                variants={itemVariants}
                whileHover={{ scale: 1.05, boxShadow: '0 10px 40px var(--glow-color)' }}
                whileTap={{ scale: 0.95 }}
            >
                {personalData.email}
            </motion.a>
            <motion.div 
                className="flex justify-center gap-8 mt-12"
                variants={containerVariants}
            >
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
                        whileHover={{ scale: 1.2, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                    />
                ))}
            </motion.div>
        </motion.div>
    </Section>
    );
};

export default ContactSection;