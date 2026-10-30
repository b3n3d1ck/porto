import React from 'react';
import { motion } from 'framer-motion';
import Section from '../layout/Section';
import { projectsData } from '../../data/constants';
import type { Project } from '../../types';
import { containerVariants, itemVariants } from '../../utils/animations';

const ProjectCard: React.FC<{ project: Project; onImageClick: (src: string) => void; }> = ({ project, onImageClick }) => (
    <motion.div 
        className="glassy rounded-2xl p-5 h-full flex flex-col"
        variants={itemVariants}
        whileHover={{
            borderColor: 'var(--accent-primary)',
            boxShadow: '0 20px 40px -15px var(--glow-color)'
        }}
    >
        {project.images && project.images.length > 0 && (
             <div className="flex overflow-x-auto space-x-3 pb-3 mb-4 snap-x snap-mandatory">
                {project.images.map((img, i) => (
                    <motion.img 
                        key={i} 
                        src={img} 
                        alt={`${project.title} screenshot ${i+1}`} 
                        className="w-full h-48 object-cover rounded-lg snap-center flex-shrink-0 cursor-pointer" 
                        onClick={() => onImageClick(img)} 
                        layoutId={`image-${img}`}
                    />
                ))}
            </div>
        )}
        <h3 className="text-xl font-bold">{project.title}</h3>
        <p className="text-[var(--text-secondary)] my-3 text-sm flex-grow">{project.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
            {project.tech.map(t => <span key={t} className="text-xs font-mono bg-blue-500/10 text-[var(--accent-secondary)] border border-[var(--accent-primary)] px-3 py-1 rounded-full">{t}</span>)}
        </div>
        {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-[var(--accent-primary)] hover:underline">View Live Project →</a>}
    </motion.div>
);


const ProjectsSection: React.FC<{ onImageClick: (src: string) => void; }> = ({ onImageClick }) => {
    return (
        <Section id="projects">
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="w-full"
            >
                <motion.h2 variants={itemVariants} className="font-mono text-3xl md:text-5xl text-center font-bold mb-16">Projects</motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projectsData.map((project) => (
                        <ProjectCard key={project.title} project={project} onImageClick={onImageClick} />
                    ))}
                </div>
            </motion.div>
        </Section>
    );
};

export default ProjectsSection;