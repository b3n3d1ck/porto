import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence, MotionConfig, motion, useScroll, useSpring, useTransform,
  useReducedMotion, useMotionValue, useVelocity, type MotionValue,
} from 'framer-motion';
import { personalData, projectsData, experienceData, educationData, techSkillsData } from './data/constants';

const nav = [['about', 'Intro'], ['work', 'Projects'], ['skills', 'Expertise'], ['journey', 'Journey']];
const profileImage = 'https://avatars.githubusercontent.com/u/210241355?s=1500&u=a47d9edf605320c59a68d24a1f8cd856916b5e37&v=200';
const ease = [0.22, 1, 0.36, 1] as const;

type Theme = 'light' | 'dark';

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (document.documentElement.dataset.theme === 'dark') return 'dark';
    try { return localStorage.getItem('portfolio-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  const reduced = useReducedMotion();
  const dark = theme === 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#151419' : '#faf9fb');
  }, [theme, dark]);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('portfolio-theme', next); } catch { /* Storage can be unavailable in private browsing. */ }
  };

  return (
    <motion.button type="button" className="theme-toggle" onClick={toggle}
      aria-label="Dark mode" aria-pressed={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      whileHover={reduced ? undefined : { scale: 1.06 }} whileTap={reduced ? undefined : { scale: 0.94 }}>
      <span className="theme-shutter" aria-hidden="true">
        <motion.span className="theme-shutter-disc" initial={false}
          animate={{ rotate: dark ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.65, ease }}>
          <svg viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="8.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 5.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" />
            <circle cx="14" cy="14" r="2" fill="var(--paper)" />
          </svg>
        </motion.span>
        <span className="theme-mode"><span>{dark ? 'NIGHT' : 'DAY'}</span><i /></span>
      </span>
    </motion.button>
  );
}

function Arrow({ diagonal = true }: { diagonal?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={diagonal ? 'M7 17 17 7M8 7h9v9' : 'M4 12h16m-6-6 6 6-6 6'} />
    </svg>
  );
}

// Smooth-scroll to an anchor regardless of hash routing, honoring reduced motion.
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// Shared scroll-velocity signal: a damped value in roughly [-1, 1] that every
// section taps to skew/shift its content with the direction and speed of scroll.
function useScrollSkew() {
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 320, damping: 48, mass: 0.4 });
  return useTransform(smooth, [-2600, 0, 2600], [-1, 0, 1], { clamp: true });
}

// Scroll-linked reveal: progress tracks element position, so each block animates
// in on the way down and fully reverses on the way up. `variant` changes the gesture.
type Variant = 'rise' | 'left' | 'right' | 'scale' | 'blur' | 'tilt-left' | 'tilt-right';
function Reveal({ children, className = '', variant = 'rise', skew }: { children: ReactNode; className?: string; variant?: Variant; skew?: MotionValue<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 96%', 'start 52%'] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.5 });
  const tilt = variant === 'tilt-left' || variant === 'tilt-right';
  const baseVariant = variant === 'tilt-left' ? 'left' : variant === 'tilt-right' ? 'right' : variant;
  const opacity = useTransform(p, [0, 0.75, 1], [reduced ? 1 : 0, 1, 1]);
  const y = useTransform(p, [0, 1], [reduced || baseVariant === 'left' || baseVariant === 'right' ? 0 : baseVariant === 'scale' ? 48 : 80, 0]);
  const x = useTransform(p, [0, 1], [reduced ? 0 : baseVariant === 'left' ? -70 : baseVariant === 'right' ? 70 : 0, 0]);
  const scale = useTransform(p, [0, 1], [reduced ? 1 : baseVariant === 'scale' ? 0.9 : 1, 1]);
  const rotateX = useTransform(p, [0, 1], [reduced || (baseVariant !== 'rise' && !tilt) ? 0 : 10, 0]);
  const rotateY = useTransform(p, [0, 1], [reduced || !tilt ? 0 : variant === 'tilt-left' ? -14 : 14, 0]);
  const blurP = useTransform(p, [0, 1], [reduced || baseVariant !== 'blur' ? 0 : 9, 0]);
  const filter = useTransform(blurP, (b) => `blur(${b}px)`);
  const fallback = useMotionValue(0);
  const vSkew = useTransform(skew ?? fallback, [-1, 1], [-4, 4]);
  return (
    <motion.div ref={ref} className={className} style={{ opacity, y, x, scale, rotateX, rotateY, filter, skewY: skew ? vSkew : 0, transformPerspective: 1400 }}>
      {children}
    </motion.div>
  );
}

function Heading({ n, title, sub, skew }: { n: string; title: string; sub: string; skew: MotionValue<number> }) {
  return (
    <Reveal variant="blur" skew={skew}>
      <div className="section-heading">
        <span className="number">{n}</span>
        <h2>{title}</h2>
        <span className="section-sub">{sub}</span>
      </div>
    </Reveal>
  );
}

// Tickers are driven by section scroll progress, never by an independent clock.
function Ticker({ items, speed = 40, skew, variant = 'dark' }: { items: ReactNode[]; speed?: number; skew: MotionValue<number>; variant?: 'dark' | 'light' | 'outline' }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], speed > 0 ? ['0%', '-38%'] : ['-38%', '0%']);
  // No velocity spring here: stopping scroll must freeze the typography immediately.
  void skew;
  return (
    <div ref={ref} className={'ticker ticker-' + variant}>
      <div className="ticker-caption"><span>{variant === 'dark' ? 'A MINDSET, NOT A MANIFESTO' : 'DISCIPLINES / CONNECTED'}</span><span>SCROLL TO MOVE ↔</span></div>
      <motion.div className="ticker-row" style={{ x: reduced ? 0 : x }}>
        {[0, 1].map((copy) => (
          <div className="ticker-copy" key={copy} aria-hidden={copy === 1}>
            {items.map((it, i) => <span className="ticker-item" key={copy + '-' + i}><small>{String(i + 1).padStart(2, '0')}</small>{it}<i className="ticker-star">↗</i></span>)}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function SpatialObject() {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(py, { stiffness: 110, damping: 20 });
  const ry = useSpring(px, { stiffness: 110, damping: 20 });
  const { scrollY } = useScroll();
  const rz = useTransform(scrollY, [0, 1800], [-18, 95]);
  return (
    <div className="spatial-stage" aria-label="Interactive three-dimensional monogram"
      onPointerMove={(e) => { if (reduced) return; const r = e.currentTarget.getBoundingClientRect(); px.set(((e.clientX - r.left) / r.width - 0.5) * 50); py.set(-((e.clientY - r.top) / r.height - 0.5) * 50); }}
      onPointerLeave={() => { px.set(0); py.set(0); }}>
      <span className="spatial-label">EXPERIMENT 001 / MOVE AROUND</span>
      <motion.div className="spatial-cube" style={{ rotateX: reduced ? -18 : rx, rotateY: reduced ? 25 : ry, rotateZ: reduced ? -18 : rz }}>
        {['ab.', '↗', '{ }', '01', '+', 'ab.'].map((face, i) => <div key={i} className={'cube-face face-' + i}>{face}</div>)}
      </motion.div>
      <span className="spatial-axis">X ─── Y ─── Z</span>
    </div>
  );
}

function MobileMenu({ onClose, goto }: { onClose: () => void; goto: (id: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>('button,a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return (
    <motion.nav ref={ref} tabIndex={-1} id="mobile-nav" className="mobile-nav" role="dialog" aria-modal="true" aria-label="Mobile navigation"
      initial={{ y: '-105%' }} animate={{ y: 0 }} exit={{ y: '-105%' }} transition={{ duration: reduced ? 0 : 0.65, ease }}>
      <div className="menu-top"><span className="brand">ab<span>.</span></span><button type="button" className="menu-close" onClick={(e) => { e.stopPropagation(); onClose(); }} onPointerUp={(e) => { e.stopPropagation(); onClose(); }} onTouchEnd={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close menu">Close <b aria-hidden="true">×</b></button></div>
      <div className="mobile-nav-inner">
        <span className="menu-kicker">GO SOMEWHERE GOOD.</span>
        {[...nav, ['contact', 'Contact']].map(([id, label], i) => (
          <motion.button key={id} type="button" className="mobile-nav-link" onClick={() => goto(id)} initial={{ opacity: 0, x: -45, rotateX: -35 }} animate={{ opacity: 1, x: 0, rotateX: 0 }} transition={{ delay: reduced ? 0 : 0.18 + i * 0.065, duration: reduced ? 0 : 0.6, ease }}>
            <span className="mobile-nav-num">0{i + 1}</span><span className="mobile-nav-label">{label}</span><Arrow />
          </motion.button>
        ))}
        <div className="menu-socials">{personalData.socials.filter((s) => s.name !== 'WhatsApp').map((s) => <a key={s.name} href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>)}</div>
        <span className="mobile-nav-foot">BANDUNG, INDONESIA / ALWAYS CURIOUS.</span>
      </div>
      <span className="menu-watermark" aria-hidden="true">EXPLORE.</span>
    </motion.nav>
  );
}

function ProjectCard({ index, position, onOpen, skew }: { index: number; position: number; onOpen: () => void; skew: MotionValue<number> }) {
  const p = projectsData[index];
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const prog = useSpring(scrollYProgress, { stiffness: 150, damping: 30 });
  // alternate drift direction per column so the grid breathes diagonally
  const dir = position % 2 === 0 ? 1 : -1;
  const objY = useTransform(prog, [0, 1], [reduced ? 0 : 40 * dir, reduced ? 0 : -40 * dir]);
  const objRot = useTransform(prog, [0, 1], [reduced ? 0 : -6 * dir, reduced ? 0 : 6 * dir]);
  const skewY = useTransform(skew, [-1, 1], [-3, 3]);
  const isSec = p.category !== 'Creative';
  const title = p.title.replace('Video Editing Valorant : ', '');
  const commands = ['observe --traffic', 'resolve --subdomains', 'launch --interface'];
  return (
    <Reveal variant={position % 2 === 0 ? 'tilt-left' : 'tilt-right'}>
      <motion.article className={'project-card palette-' + (index % 4)} style={{ skewY }} whileHover={{ y: -8 }} transition={{ duration: 0.4, ease }}>
        <button onClick={onOpen} aria-label={'Open ' + p.title}>
          <div className="project-visual" ref={ref}>
            <span className="visual-label">{p.repository ? 'GITHUB / OPEN SOURCE' : isSec ? 'SECURITY & DEVELOPMENT' : 'FILM & STORYTELLING'}</span>
            <motion.div className="project-object" style={{ y: objY, rotate: objRot }}>
              {isSec ? (
                <>
                  <div className="code-window">
                    <div className="window-top"><i /><i /><i /><span>abraham / {index === 1 ? 'research' : 'workspace'}</span></div>
                    <div className="code-lines">
                      <span className="code-comment">// curiosity meets engineering</span>
                      <p><em>$</em> {commands[index] ?? ('open /' + p.title.toLowerCase().split(' ').join('-'))}</p>
                      <p>&#8627; {p.language ?? p.tech[0]}</p>
                      <p><em>const</em> view = <b>"different"</b>;</p>
                      <span className="code-bottom">&#8627; always a layer deeper <i className="caret" /></span>
                    </div>
                  </div>
                  <div className="object-stamp">&lt;/&gt;</div>
                </>
              ) : (
                <>
                  <div className="film-frame">
                    <span className="film-time">AB FILMS / {String(index).padStart(2, '0')}</span>
                    <span className="play-icon">&#9655;</span>
                    <strong>{title}</strong>
                    <span className="film-bottom">A STORY WORTH TELLING</span>
                  </div>
                  <div className="film-disc" />
                </>
              )}
            </motion.div>
            <span className="visual-index">{String(position + 1).padStart(2, '0')} — SELECTED WORK</span>
            <span className="visual-arrow"><Arrow /></span>
          </div>
          <div className="project-info">
            <div className="tags">{p.tech.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>
            <h3>{p.title}</h3>
            <p className="project-summary">{p.description}</p><div className="project-cta">Explore project <Arrow diagonal={false} /></div>
          </div>
        </button>
      </motion.article>
    </Reveal>
  );
}

function ProjectDialog({ index, onClose }: { index: number; onClose: () => void }) {
  const p = projectsData[index];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = ref.current?.querySelectorAll<HTMLElement>('button,a[href]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);
  return (
    <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="project-title" className="dialog"
        initial={{ y: 80, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.45, ease }} onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>Close ×</button>
        <span className="eyebrow">PROJECT ARCHIVE / {String(index + 1).padStart(2, '0')}</span>
        <h2 id="project-title">{p.title}</h2>
        <p>{p.description}</p>
        <div className="tags">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
        {p.repository && <a className="dialog-link" href={p.repository} target="_blank" rel="noreferrer">View source on GitHub <Arrow /></a>}
        {p.url && p.url !== p.repository && <a className="dialog-link" href={p.url} target="_blank" rel="noreferrer">Visit live project <Arrow /></a>}
      </motion.div>
    </motion.div>
  );
}

// Full-screen opening sequence: a counter, a wipe, then the name splits away.
function Intro({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { onDone(); return; }
    let v = 0;
    const started = performance.now();
    const minDuration = 2600;
    const id = setInterval(() => {
      const elapsed = performance.now() - started;
      const remaining = Math.max(0, minDuration - elapsed);
      // Crawl while time remains, then finish with eased steps.
      const maxStep = remaining > 500 ? 4 : 9 + Math.floor(Math.random() * 9);
      v = Math.min(100, v + 1 + Math.floor(Math.random() * maxStep));
      if (remaining <= 0 && v >= 100) { setCount(100); clearInterval(id); return; }
      if (remaining <= 0) v = Math.min(99, v);
      setCount(v);
    }, 120);
    return () => clearInterval(id);
  }, [reduced, onDone]);
  if (reduced) return null;
  return (
    <motion.div className="intro" initial={{ opacity: 1 }} exit={{ opacity: 0 }} onAnimationComplete={() => { }}>
      <motion.div className="intro-panels" exit={{}}>
        <motion.div className="intro-panel left" initial={{ y: 0 }} animate={count >= 100 ? { y: '-101%' } : {}} transition={{ duration: 0.9, ease, delay: 0.3 }} onAnimationComplete={() => count >= 100 && onDone()} />
        <motion.div className="intro-panel right" initial={{ y: 0 }} animate={count >= 100 ? { y: '101%' } : {}} transition={{ duration: 0.9, ease, delay: 0.3 }} />
      </motion.div>
      <motion.div className="intro-content" animate={count >= 100 ? { opacity: 0, scale: 1.08 } : {}} transition={{ duration: 0.5, ease }}>
        <span className="intro-label">ABRAHAM BENEDICK — PORTFOLIO</span>
        <div className="intro-name">
          {'ab.'.split('').map((c, i) => (
            <motion.span key={i} initial={{ y: '115%' }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease }}>{c}</motion.span>
          ))}
        </div>
        <div className="intro-count"><span>{String(count).padStart(3, '0')}</span><i>/ 100</i></div>
      </motion.div>
    </motion.div>
  );
}

function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const artY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 150]);
  const artRot = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 10]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.2]);
  const d = (base: number) => (reduced ? 0 : base) + 0.1; // stagger starts only after intro
  const show = ready || reduced;
  return (
    <section id="home" className="hero" ref={ref}>
      <motion.div className="hero-topline" initial={{ opacity: 0 }} animate={show ? { opacity: 1 } : {}} transition={{ delay: d(0.1), duration: 0.8 }}>
        <span><i className="status-dot" /> SECURITY RESEARCHER & CREATIVE DEVELOPER</span>
        <span className="location">BASED IN BANDUNG · UTC+7</span>
      </motion.div>
      <motion.div className="hero-grid" style={{ y: textY, opacity: fade }}>
        <div>
          <h1 aria-label="Abraham Benedick.">
            {['Abraham', 'Benedick.'].map((word, i) => (
              <span className="line-mask" key={word}>
                <motion.span initial={{ y: '115%', rotate: 5 }} animate={show ? { y: 0, rotate: 0 } : {}} transition={{ duration: 1.15, delay: d(0.1 + i * 0.14), ease }}>
                  {word.split('').map((letter, j) => (
                    <motion.span className={'name-glyph' + (letter === '.' ? ' name-period' : '')} key={j}
                      initial={{ y: reduced ? 0 : '120%', x: reduced ? 0 : (j % 2 ? 14 : -14), rotate: reduced ? 0 : (j % 2 ? 14 : -12), opacity: 0, filter: reduced ? 'none' : 'blur(8px)' }}
                      animate={show ? { y: '0%', x: 0, rotate: 0, opacity: 1, filter: 'blur(0px)' } : {}}
                      transition={{ duration: reduced ? 0 : 1.25, delay: d(0.16 + i * 0.2 + j * 0.045), ease }}
                      >{letter}</motion.span>
                  ))}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="hero-description" initial={{ opacity: 0, y: 24 }} animate={show ? { opacity: 1, y: 0 } : {}} transition={{ delay: d(0.5), duration: 0.9 }}>
            Memahami sistem sampai ke dalam.<br />Membangun sesuatu yang <span>berbeda.</span>
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 24 }} animate={show ? { opacity: 1, y: 0 } : {}} transition={{ delay: d(0.65), duration: 0.9 }}>
            <a href="#work" onClick={(e) => { e.preventDefault(); scrollToId('work'); }} className="button button-dark">Explore my work <Arrow /></a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }} className="quiet-link">Let’s connect <Arrow /></a>
          </motion.div>
        </div>
        <motion.div className="hero-art" style={{ y: artY, rotate: artRot, scale: artScale }} initial={{ opacity: 0, scale: 0.86, y: 40 }} animate={show ? { opacity: 1, scale: 1, y: 0 } : {}} transition={{ duration: 1.3, delay: d(0.25), ease }}>
          <div className="portrait">
            <div className="portrait-grid" />
            <motion.div className="portrait-orbit" animate={{ rotate: 360 }} transition={{ duration: 36, repeat: Infinity, ease: 'linear' }} />
            <span className="portrait-corner">AB / PERSONAL ARCHIVE</span>
            <img className="portrait-photo" src={profileImage} alt="Abraham Benedick" loading="eager" />
            <span className="portrait-caption">Curiosity, by design.<br /><b>Bandung, Indonesia</b></span>
            <div className="portrait-cross">+</div>
          </div>
          <SpatialObject />
          <span className="art-note">ENGINEERING MIND.<br />CREATIVE INSTINCT.</span>
        </motion.div>
      </motion.div>
      <motion.div className="hero-footer" initial={{ opacity: 0 }} animate={show ? { opacity: 1 } : {}} transition={{ delay: d(0.85), duration: 0.9 }}>
        <span>TELECOMMUNICATION ENGINEERING<br /><b>TELKOM UNIVERSITY</b></span>
        <span>SECURITY · WEB · FILM<br /><b>THREE WORLDS. ONE PERSPECTIVE.</b></span>
        <a href="#about" onClick={(e) => { e.preventDefault(); scrollToId('about'); }}>SCROLL TO EXPLORE <span className="scroll-pill">↓</span></a>
      </motion.div>
    </section>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);
  const [openSkill, setOpenSkill] = useState<number | null>(0);
  const [copied, setCopied] = useState('Copy email');
  const { scrollYProgress, scrollY } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 30 });
  const skew = useScrollSkew();
  const reducedMotion = useReducedMotion();
  const glowY = useTransform(scrollY, [0, 3000], [0, reducedMotion ? 0 : -140]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.12, 0.85, 1], [0.9, 1, 0.9, 0.7]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const closeMenu = useCallback(() => setMenu(false), []);

  const goto = (id: string) => { setMenu(false); setTimeout(() => scrollToId(id), 700); };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{!ready && <Intro onDone={() => setReady(true)} />}</AnimatePresence>
      <div className="background-grid" />
      <motion.div className="background-glow" aria-hidden="true" style={{ y: glowY, opacity: glowOpacity }} />
      <motion.div className="reading-progress" style={{ scaleX: progress }} />

      <div className="site-shell">
        <header className="header">
          <a href="#home" className="brand" onClick={(e) => { e.preventDefault(); scrollToId('home'); }} aria-label="Abraham Benedick home">ab<span>.</span></a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([id, label]) => <a href={'#' + id} onClick={(e) => { e.preventDefault(); scrollToId(id); }} key={id}>{label}</a>)}
          </nav>
          <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }} className="nav-contact">Let’s talk <Arrow /></a>
          <ThemeToggle />
          <button className={'menu-toggle ' + (menu ? 'is-open' : '')} aria-expanded={menu} aria-controls="mobile-nav" aria-label="Toggle menu" onClick={() => setMenu(!menu)}>
            <span className="burger"><i /><i /><i /></span>
          </button>
        </header>
      </div>

      <AnimatePresence>
        {menu && (
          <MobileMenu onClose={closeMenu} goto={goto} />
        )}
      </AnimatePresence>

      <div className="site-shell">
        <main>
          <Hero ready={ready} />

          <section id="about" className="section">
            <Heading n="01" title="A little context." sub="the person behind the work" skew={skew} />
            <div className="intro-grid">
              <Reveal variant="left" skew={skew}>
                <span className="eyebrow">CURIOUS BY DEFAULT</span>
                <h3 className="statement">Technology is<br />a language.<br /><em>I keep exploring.</em></h3>
              </Reveal>
              <Reveal variant="right" className="intro-copy" skew={skew}>
                <p>Saya Abraham Benedick. Mahasiswa Teknik Telekomunikasi di Telkom University, dengan ketertarikan pada <strong>web security, pengembangan web, dan jaringan.</strong></p>
                <p>Dari penetration testing, PHP, dan full-stack development sampai riset di Cyber Physical System Laboratory—saya suka memahami apa yang terjadi di balik sebuah sistem.</p>
                <p>Di luar kode, saya bercerita lewat video, film pendek, dan motion. Dua sisi yang berbeda, rasa ingin tahu yang sama.</p>
                <a className="inline-link" href="#journey" onClick={(e) => { e.preventDefault(); scrollToId('journey'); }}>Get to know my journey <Arrow /></a>
              </Reveal>
            </div>
          </section>
        </main>
      </div>

      <Ticker skew={skew} speed={46} items={['Think deeper', 'Build better', 'Stay curious', 'Question everything', 'Ship with intent']} />
      <div className="site-shell">
        <main>
          <section className="section" id="work">
            <Heading n="02" title="Selected projects." sub="ideas, systems & stories" skew={skew} />
            <Reveal variant="blur" skew={skew}>
              <div className="work-intro">
                <p>A collection of things I’ve explored,<br /><strong>built, and brought to life.</strong></p>
                <div className="filters" aria-label="Filter projects">
                  {['All', 'Development', 'Security', 'Creative'].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>
                      {filter === f && <motion.span layoutId="filter-pill" className="filter-pill" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}
                      <span>{f}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>
            <div className="projects" key={filter}>
              {projectsData.map((_, i) => i)
                .filter((i) => filter === 'All' || projectsData[i].category === filter)
                .map((i, pos) => <ProjectCard key={i} index={i} position={pos} onOpen={() => setSelected(i)} skew={skew} />)}
            </div>
          </section>
        </main>
      </div>

      <Ticker skew={skew} speed={-38} variant="outline" items={['Pentesting', 'Web Security', 'Full-stack', 'Cloudflare', 'Automation', 'Film & Motion', 'Networking']} />

      <div className="site-shell">
        <main>
          <section id="skills" className="section">
            <Heading n="03" title="The working toolkit." sub="always another layer" skew={skew} />
            <div className="skills-layout">
              <Reveal variant="left" skew={skew}>
                <h3 className="statement">Different tools.<br /><em>Same curiosity.</em></h3>
                <p className="small-copy">Security, code, and everything in between. A toolkit that keeps evolving with the next challenge.</p>
                <div className="toolkit-mark" aria-hidden="true">
                  <span className="toolkit-mark-label">CONNECTING THE DOTS</span>
                  <svg viewBox="0 0 240 100" fill="none">
                    <path d="M12 70H66L106 30H164L204 70H228" stroke="var(--line)" strokeWidth="1.5" />
                    <motion.path d="M12 70H66L106 30H164L204 70H228" stroke="var(--red)" strokeWidth="1.5"
                      initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease }} />
                    {[ [12,70], [106,30], [164,30], [228,70] ].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="4" fill="var(--paper)" stroke="var(--red)" strokeWidth="1.5" />)}
                  </svg>
                  <span className="toolkit-mark-foot">RESEARCH / BUILD / CREATE</span>
                </div>
              </Reveal>
              <div className="skill-list">
                {techSkillsData.map((skill, i) => (
                  <Reveal key={skill.name} variant="right" skew={skew}>
                    <div className={'skill-item ' + (openSkill === i ? 'is-open' : '')}>
                      <button aria-expanded={openSkill === i} aria-controls={'skill-' + i} onClick={() => setOpenSkill(openSkill === i ? null : i)}>
                        <span className="number">{String(i + 1).padStart(2, '0')}</span>
                        <span>{skill.name}</span>
                        <motion.span className="skill-plus" animate={{ rotate: openSkill === i ? 45 : 0 }}>+</motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {openSkill === i && (
                          <motion.div id={'skill-' + i} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }}>
                            <p>{skill.desc}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section id="journey" className="section">
            <Heading n="04" title="Learning, in motion." sub="the journey so far" skew={skew} />
            <div className="journey-grid">
              <div>
                <Reveal variant="rise" skew={skew}><h3 className="column-label">EXPERIENCE & HIGHLIGHTS</h3></Reveal>
                {[...experienceData].reverse().map((e, i) => (
                  <Reveal key={e.title} variant="left" skew={skew}>
                    <article className="timeline-item">
                      <span className="timeline-dot" />
                      <span className="timeline-order">0{i + 1}</span>
                      <p className="meta">{e.meta}</p>
                      <h3>{e.title}</h3>
                      <p>{e.description}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
              <div>
                <Reveal variant="rise" skew={skew}><h3 className="column-label">EDUCATION</h3></Reveal>
                {educationData.map((e) => (
                  <Reveal key={e.title} variant="right" skew={skew}>
                    <article className="education">
                      <span className="education-icon">↗</span>
                      <p className="meta">{e.meta}</p>
                      <h3>{e.title}</h3>
                      {e.description && <p>{e.description}</p>}
                    </article>
                  </Reveal>
                ))}
                <Reveal variant="scale" skew={skew}>
                  <div className="note-card">
                    <span className="eyebrow">A PERSONAL REMINDER</span>
                    <p>Stay a beginner.<br />Keep asking why.<br /><em>Make it matter.</em></p>
                    <span className="note-star">✳</span>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
        </main>
      </div>


      <div className="site-shell">
        <main>
          <section id="contact" className="section contact">
            <Heading n="05" title="Start a conversation." sub="good things begin here" skew={skew} />
            <Reveal variant="scale" skew={skew}>
              <div className="contact-grid">
                <div>
                  <span className="eyebrow">HAVE SOMETHING IN MIND?</span>
                  <h2>Let’s make<br /><em>it happen.</em><span className="contact-star">✳</span></h2>
                  <p>Project baru, ide menarik, atau sekadar bertukar perspektif.<br />Saya selalu terbuka untuk percakapan yang baik.</p>
                  <a className="button button-dark" href={'mailto:' + personalData.email}>Say hello <Arrow /></a>
                </div>
                <div className="contact-links">
                  <span className="eyebrow">FIND ME ELSEWHERE</span>
                  {personalData.socials.map((s) => <a key={s.name} href={s.url} target="_blank" rel="noreferrer"><span>{s.name}<small>{s.name === 'Instagram' ? '@abrah4m.b' : s.name === 'GitHub' ? '@b3n3d1ck' : s.name === 'LinkedIn' ? '/in/a-benedick' : 'Direct message'}</small></span><Arrow /></a>)}
                  <div className="email-block">
                    <a href={'mailto:' + personalData.email}>{personalData.email}</a>
                    <button aria-live="polite" onClick={async () => { try { await navigator.clipboard.writeText(personalData.email); setCopied('Email copied'); } catch { setCopied('Select email to copy'); } }}>{copied} ↗</button>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>

        <footer>
          <a href="#home" className="brand" onClick={(e) => { e.preventDefault(); scrollToId('home'); }}>ab<span>.</span></a>
          <span>© {new Date().getFullYear()} Abraham Benedick<br /><small>Made with curiosity. Always in progress.</small></span>
          <a href="#home" className="back-top" onClick={(e) => { e.preventDefault(); scrollToId('home'); }}>Back to top ↑</a>
        </footer>
      </div>

      <AnimatePresence>{selected !== null && <ProjectDialog index={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}
