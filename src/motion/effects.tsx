import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionTemplate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────────────────────────────────────────
   1. DynamicBox — containers that refuse to sit still.

   A wrapper whose border draws itself as the block enters, which
   then holds a parallax offset against the background and breathes
   a little with scroll direction.
   ─────────────────────────────────────────────────────────── */

export function DynamicBox({
  children,
  className = '',
  depth = 26,
  rim = true,
  velocity,
}: {
  children: ReactNode;
  className?: string;
  /** how far this box lags the background, in px */
  depth?: number;
  rim?: boolean;
  velocity?: MotionValue<number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const enter = useScroll({ target: ref, offset: ['start 92%', 'start 42%'] }).scrollYProgress;

  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.5 });
  const e = useSpring(enter, { stiffness: 140, damping: 32, mass: 0.5 });

  const y = useTransform(p, [0, 1], [reduced ? 0 : depth, reduced ? 0 : -depth]);
  const idle = useMotionValue(0);
  const breath = useTransform(velocity ?? idle, [-1, 0, 1], [0.992, 1, 1.008]);
  const scale = useSpring(breath, { stiffness: 180, damping: 26 });
  const pathLength = useTransform(e, [0, 1], [reduced ? 1 : 0, 1]);

  return (
    <motion.div
      ref={ref}
      className={`dyn-box ${className}`}
      style={{ y, scale: reduced ? 1 : scale }}
    >
      {rim && (
        <svg className="dyn-rim" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100">
          <motion.rect
            x="0.4"
            y="0.4"
            width="99.2"
            height="99.2"
            rx="1"
            fill="none"
            stroke="var(--red)"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
            style={{ pathLength }}
          />
        </svg>
      )}
      {children}
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────
   2. MaskText — a line revealed by a travelling mask as it
   enters the viewport, word by word, with a wipe that trails.
   ─────────────────────────────────────────────────────────── */

export function MaskText({
  text,
  className = '',
  as: Tag = 'span',
  stagger = 0.055,
}: {
  text: string;
  className?: string;
  as?: 'span' | 'h2' | 'h3' | 'p';
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // The container is observed, never the inner span: a masked word is clipped
  // out of view by its own overflow:hidden, so observing it would never fire.
  const seen = useInView(ref, { once: true, amount: 0.2 });
  const words = text.split(' ');
  const Comp = motion[Tag] as React.ElementType;
  return (
    <Comp ref={ref} className={`mask-text ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <span className="mask-word" key={`${w}-${i}`} aria-hidden="true">
          <motion.span
            initial={reduced ? false : { y: '110%', rotate: 3 }}
            animate={seen || reduced ? { y: '0%', rotate: 0 } : undefined}
            transition={{ duration: 0.85, delay: i * stagger, ease: EASE }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}

/* ───────────────────────────────────────────────────────────
   3. OutlineFill — hollow display type that fills with ink as
   the block scrolls through, driven by a clip on a solid copy
   layered over the outlined one.
   ─────────────────────────────────────────────────────────── */

export function OutlineFill({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 88%', 'end 45%'] });
  const p = useSpring(scrollYProgress, { stiffness: 130, damping: 30 });
  const pct = useTransform(p, [0, 1], [reduced ? 100 : 0, 100]);
  const clip = useMotionTemplate`inset(0 ${useTransform(pct, (v) => 100 - v)}% 0 0)`;

  return (
    <span className={`outline-fill ${className}`} ref={ref} aria-label={text}>
      <span className="of-hollow" aria-hidden="true">{text}</span>
      <motion.span className="of-solid" aria-hidden="true" style={{ clipPath: clip }}>
        {text}
      </motion.span>
    </span>
  );
}

/* ───────────────────────────────────────────────────────────
   4. ColorShift — a run of text whose ink travels between the
   body colour and the accent as its section scrolls past.
   ─────────────────────────────────────────────────────────── */

export function ColorShift({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'end 35%'] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const mix = useTransform(p, [0, 0.55, 1], [0, 100, 0]);
  const color = useMotionTemplate`color-mix(in oklab, var(--red) ${mix}%, var(--ink))`;
  return (
    <motion.span ref={ref} className={className} style={reduced ? undefined : { color }}>
      {children}
    </motion.span>
  );
}

/* ───────────────────────────────────────────────────────────
   5. MagneticChars — big type that reacts per glyph to a nearby
   pointer: letters lean toward the cursor and settle back.
   ─────────────────────────────────────────────────────────── */

export function MagneticChars({
  text,
  className = '',
  radius = 130,
  strength = 20,
}: {
  text: string;
  className?: string;
  radius?: number;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const chars = useRef<HTMLSpanElement[]>([]);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === 'touch') return;
    for (const c of chars.current) {
      if (!c) continue;
      const r = c.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const f = Math.max(0, 1 - d / radius);
      c.style.transform = `translate3d(${(dx / (d || 1)) * f * strength}px, ${(dy / (d || 1)) * f * strength}px, 0)`;
      c.style.color = f > 0.45 ? 'var(--red)' : '';
    }
  };
  const reset = () => {
    for (const c of chars.current) {
      if (!c) continue;
      c.style.transform = '';
      c.style.color = '';
    }
  };

  return (
    <span
      ref={ref}
      className={`mag-chars ${className}`}
      aria-label={text}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="mag-char"
          ref={(el) => {
            if (el) chars.current[i] = el;
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
