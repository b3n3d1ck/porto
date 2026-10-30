import { useState, useEffect, useRef } from 'react';

export const useScrambleText = (text: string, duration = 2000) => {
    const [scrambledText, setScrambledText] = useState('');
    const ref = useRef<HTMLParagraphElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        let animationFrameId: number;
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()-_=+[]{};:'\",.<>?/\\|";
        const frameRate = 60;
        const totalFrames = Math.round(duration / (1000 / frameRate));
        let frame = 0;

        const revealAt = Array.from({ length: text.length }, (_, i) => 
            Math.floor(totalFrames * (0.2 + 0.8 * (i / text.length))) + Math.floor(Math.random() * (totalFrames * 0.15))
        );

        const step = () => {
            frame++;
            let out = '';
            for (let i = 0; i < text.length; i++) {
                if (frame >= revealAt[i]) {
                    out += text[i];
                } else {
                    out += text[i] === ' ' ? ' ' : letters[Math.floor(Math.random() * letters.length)];
                }
            }
            setScrambledText(out);
            if (frame < totalFrames + 20) {
                animationFrameId = requestAnimationFrame(step);
            } else {
                setScrambledText(text);
            }
        };
        
        step();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [text, duration]);

    return [ref, scrambledText] as const;
};
