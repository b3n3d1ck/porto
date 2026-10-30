import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { sections, navIcons } from '../../data/constants';

const Navigation: React.FC<{ activeSection: string }> = ({ activeSection }) => {
    const navRef = useRef<HTMLElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isMobile || !navRef.current) return;
        const nav = navRef.current;
        const rect = nav.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        nav.querySelectorAll('.dock-item').forEach(item => {
            const itemEl = item as HTMLElement;
            const itemRect = itemEl.getBoundingClientRect();
            const itemCenterX = itemRect.left - rect.left + itemRect.width / 2;
            const distance = Math.abs(mouseX - itemCenterX);
            const scale = Math.max(1, 1.8 - distance / 80);
            itemEl.style.transform = `scale(${scale}) translateY(${(scale - 1) * -20}px)`;
            itemEl.style.zIndex = distance < 50 ? '2' : '1';
        });
    };

    const handleMouseLeave = () => {
        if (isMobile || !navRef.current) return;
        navRef.current.querySelectorAll('.dock-item').forEach(item => {
            const itemEl = item as HTMLElement;
            itemEl.style.transform = 'scale(1) translateY(0)';
            itemEl.style.zIndex = '1';
        });
    };

    return (
        <nav 
            ref={navRef} 
            onMouseMove={handleMouseMove} 
            onMouseLeave={handleMouseLeave} 
            className="glassy fixed z-50 flex items-center 
            top-0 left-0 right-0 justify-center rounded-none h-16 border-b 
            md:top-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:right-auto md:rounded-3xl md:p-2 md:h-auto md:border-none"
        >
            <div className="dock-items flex justify-center items-center flex-1 gap-2 sm:gap-4 md:gap-2">
                {sections.map(({ id, label }) => (
                     <a
                        key={id}
                        href={`#${id}`}
                        className={`dock-item flex items-center justify-center cursor-pointer transition-colors duration-300
                            w-10 h-10 rounded-lg 
                            md:w-12 md:h-12 md:rounded-xl 
                            ${activeSection === id ? 'active text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        aria-label={label}
                        dangerouslySetInnerHTML={{ __html: navIcons[label] || '' }}
                    />
                ))}
            </div>
        </nav>
    );
};

export default Navigation;
