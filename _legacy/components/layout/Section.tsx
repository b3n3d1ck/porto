import React from 'react';

const Section: React.FC<{ id: string; children: React.ReactNode; className?: string }> = ({ id, children, className = '' }) => (
    <section id={id} className={`min-h-screen py-32 md:py-40 flex items-center relative overflow-hidden ${className}`}>
      <div className="container mx-auto px-4 sm:px-6">
        {children}
      </div>
    </section>
);

export default Section;
