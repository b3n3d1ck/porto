import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { personalData, projectsData, experienceData, educationData, techSkillsData } from './data/constants';

const nav = [['about', 'Intro'], ['work', 'Projects'], ['skills', 'Expertise'], ['journey', 'Journey']];
const ease = [0.22, 1, 0.36, 1] as const;

function Arrow({ diagonal = true }: { diagonal?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={diagonal ? 'M7 17 17 7M8 7h9v9' : 'M4 12h16m-6-6 6 6-6 6'} />
    </svg>
  );
}

// Scroll-linked reveal. Progress is driven by the element's position, so it
// animates in on the way down and reverses on the way back up.
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'start 55%'] });
  const y = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 70, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [reduced ? 1 : 0.1, 1, 1]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 8, 0]);
  return (
    <motion.div ref={ref} className={className} style={{ y, opacity, rotateX, transformPerspective: 1200 }}>
      {children}
    </motion.div>
  );
}

function Heading({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <Reveal>
      <div className="section-heading">
        <span className="number">{n}</span>
        <h2>{title}</h2>
        <span className="section-sub">{sub}</span>
      </div>
    </Reveal>
  );
}

function Portrait() {
  return (
    <div className="portrait" aria-label="Abraham Benedick identity graphic">
      <div className="portrait-grid" />
      <motion.div className="portrait-orbit" animate={{ rotate: 360 }} transition={{ duration: 35, repeat: Infinity, ease: 'linear' }} />
      <span className="portrait-corner">AB / PERSONAL ARCHIVE</span>
      <div className="monogram">ab<span>.</span></div>
      <span className="portrait-caption">Curiosity, by design.<br /><b>Bandung, Indonesia</b></span>
      <div className="portrait-cross">+</div>
    </div>
  );
}

function ProjectCard({ index, onOpen }: { index: number; onOpen: () => void }) {
  const p = projectsData[index];
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Per-card parallax: the inner object drifts against the scroll and tilts,
  // mapped continuously so it reverses when the user scrolls back up.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 34, reduced ? 0 : -34]);
  const rotate = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : -5, reduced ? 0 : 5]);
  const titles = ['NETWORK / SYSTEMS', 'DNS / AUTOMATION', 'NEXARIUM / INTERFACE', 'JOSUA & MAY', 'BISA TAPI MATI', 'OFFLINE → ONLINE', 'TEMUKAN MIMPI', 'MASA DEPAN KITA'];
  const commands = ['observe --traffic', 'resolve --subdomains', 'launch --interface'];
  return (
    <Reveal>
      <motion.article className={'project-card palette-' + (index % 4)} whileHover={{ y: -7 }} transition={{ duration: 0.35, ease }}>
        <button onClick={onOpen} aria-label={'Open ' + p.title}>
          <div className="project-visual" ref={ref}>
            <span className="visual-label">{index < 3 ? 'SECURITY & DEVELOPMENT' : 'FILM & STORYTELLING'}</span>
            <motion.div className="project-object" style={{ y, rotate }}>
              {index < 3 ? (
                <>
                  <div className="code-window">
                    <div className="window-top"><i /><i /><i /><span>abraham / {index === 1 ? 'research' : 'workspace'}</span></div>
                    <div className="code-lines">
                      <span className="code-comment">// curiosity meets engineering</span>
                      <p><em>$</em> {commands[index]}</p>
                      <p>&#8627; mapping behavior</p>
                      <p><em>const</em> view = <b>"different"</b>;</p>
                      <span className="code-bottom">&#8627; always a layer deeper <i className="caret" /></span>
                    </div>
                  </div>
                  <div className="object-stamp">&lt;/&gt;</div>
                </>
              ) : (
                <>
                  <div className="film-frame">
                    <span className="film-time">AB FILMS / {String(index + 1).padStart(2, '0')}</span>
                    <span className="play-icon">&#9655;</span>
                    <strong>{titles[index]}</strong>
                    <span className="film-bottom">A STORY WORTH TELLING</span>
                  </div>
                  <div className="film-disc" />
                </>
              )}
            </motion.div>
            <span className="visual-index">{String(index + 1).padStart(2, '0')} — SELECTED WORK</span>
            <span className="visual-arrow"><Arrow /></span>
          </div>
          <div className="project-info">
            <div className="tags">{p.tech.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>
            <h3>{p.title}</h3>
            <div className="project-cta">Explore project <Arrow diagonal={false} /></div>
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
        initial={{ y: 70, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.4, ease }} onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose}>Close ×</button>
        <span className="eyebrow">PROJECT ARCHIVE / {String(index + 1).padStart(2, '0')}</span>
        <h2 id="project-title">{p.title}</h2>
        <p>{p.description}</p>
        <div className="tags">{p.tech.map((t) => <span key={t}>{t}</span>)}</div>
        {p.url && <a className="dialog-link" href={p.url} target="_blank" rel="noreferrer">Visit live project <Arrow /></a>}
      </motion.div>
    </motion.div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 110]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 9]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -40]);
  return (
    <section id="home" className="hero" ref={ref}>
      <div className="hero-topline">
        <span><i className="status-dot" /> SECURITY RESEARCHER & CREATIVE DEVELOPER</span>
        <span className="location">BASED IN BANDUNG · UTC+7</span>
      </div>
      <motion.div className="hero-grid" style={{ y: textY }}>
        <div>
          <h1 aria-label="Abraham Benedick.">
            {['Abraham', 'Benedick.'].map((word, i) => (
              <span className="line-mask" key={word}>
                <motion.span initial={{ y: '110%', rotate: 4 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 1.1, delay: 0.12 + i * 0.12, ease }}>
                  {word.replace('.', '')}<em>{i === 1 ? '.' : ''}</em>
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="hero-description" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.8 }}>
            Memahami sistem sampai ke dalam.<br />Membangun sesuatu yang <span>berbeda.</span>
          </motion.p>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}>
            <a href="#work" className="button button-dark">Explore my work <Arrow /></a>
            <a href="#contact" className="quiet-link">Let’s connect <Arrow /></a>
          </motion.div>
        </div>
        <motion.div className="hero-art" style={{ y, rotate }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 0.25, ease }}>
          <Portrait />
          <span className="art-note">ENGINEERING MIND.<br />CREATIVE INSTINCT.</span>
        </motion.div>
      </motion.div>
      <div className="hero-footer">
        <span>TELECOMMUNICATION ENGINEERING<br /><b>TELKOM UNIVERSITY</b></span>
        <span>SECURITY · WEB · FILM<br /><b>THREE WORLDS. ONE PERSPECTIVE.</b></span>
        <a href="#about">SCROLL TO EXPLORE <span className="scroll-pill">↓</span></a>
      </div>
    </section>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);
  const [openSkill, setOpenSkill] = useState<number | null>(0);
  const [copied, setCopied] = useState('Copy email');
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 30 });
  const marqueeX = useTransform(scrollYProgress, [0, 1], ['2%', '-38%']);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="background-grid" />
      <motion.div className="reading-progress" style={{ scaleX: progress }} />
      <div className="site-shell">
        <header className="header">
          <a href="#home" className="brand" aria-label="Abraham Benedick home">ab<span>.</span></a>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([id, label]) => <a href={'#' + id} key={id}>{label}</a>)}
          </nav>
          <a href="#contact" className="nav-contact">Let’s talk <Arrow /></a>
          <button className="menu-toggle" aria-expanded={menu} aria-controls="mobile-nav" onClick={() => setMenu(!menu)}>{menu ? 'Close −' : 'Menu +'}</button>
        </header>
        <AnimatePresence>
          {menu && (
            <motion.nav id="mobile-nav" className="mobile-nav" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {[...nav, ['contact', 'Contact']].map(([id, label], i) => (
                <motion.a key={id} href={'#' + id} onClick={() => setMenu(false)} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <span>0{i + 1}</span>{label}<Arrow />
                </motion.a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>

        <main>
          <Hero />

          <section id="about" className="section">
            <Heading n="01" title="A little context." sub="the person behind the work" />
            <div className="intro-grid">
              <Reveal>
                <span className="eyebrow">CURIOUS BY DEFAULT</span>
                <h3 className="statement">Technology is<br />a language.<br /><em>I keep exploring.</em></h3>
              </Reveal>
              <Reveal className="intro-copy">
                <p>Saya Abraham Benedick. Mahasiswa Teknik Telekomunikasi di Telkom University, dengan ketertarikan pada <strong>web security, pengembangan web, dan jaringan.</strong></p>
                <p>Dari penetration testing, PHP, dan full-stack development sampai riset di Cyber Physical System Laboratory—saya suka memahami apa yang terjadi di balik sebuah sistem.</p>
                <p>Di luar kode, saya bercerita lewat video, film pendek, dan motion. Dua sisi yang berbeda, rasa ingin tahu yang sama.</p>
                <a className="inline-link" href="#journey">Get to know my journey <Arrow /></a>
              </Reveal>
            </div>
          </section>
        </main>
      </div>

      <div className="marquee" aria-hidden="true">
        <motion.div style={{ x: marqueeX }}>
          {Array.from({ length: 4 }, (_, i) => <span key={i}>Think deeper. <i>Build better.</i> Stay curious. <b>✳</b> </span>)}
        </motion.div>
      </div>

      <div className="site-shell">
        <main>
          <section className="section" id="work">
            <Heading n="02" title="Selected projects." sub="ideas, systems & stories" />
            <Reveal>
              <div className="work-intro">
                <p>A collection of things I’ve explored,<br /><strong>built, and brought to life.</strong></p>
                <div className="filters" aria-label="Filter projects">
                  {['All', 'Security', 'Creative'].map((f) => (
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
                .filter((i) => filter === 'All' || (filter === 'Security' ? i < 3 : i >= 3))
                .map((i) => <ProjectCard key={i} index={i} onOpen={() => setSelected(i)} />)}
            </div>
          </section>

          <section id="skills" className="section">
            <Heading n="03" title="The working toolkit." sub="always another layer" />
            <div className="skills-layout">
              <Reveal>
                <h3 className="statement">Different tools.<br /><em>Same curiosity.</em></h3>
                <p className="small-copy">Security, code, and everything in between. A toolkit that keeps evolving with the next challenge.</p>
                <div className="skill-decoration" aria-hidden="true">
                  {'{'}<motion.span animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}>✳</motion.span>{'}'}
                </div>
              </Reveal>
              <div className="skill-list">
                {techSkillsData.map((skill, i) => (
                  <Reveal key={skill.name}>
                    <div className={'skill-item ' + (openSkill === i ? 'is-open' : '')}>
                      <button aria-expanded={openSkill === i} aria-controls={'skill-' + i} onClick={() => setOpenSkill(openSkill === i ? null : i)}>
                        <span className="number">{String(i + 1).padStart(2, '0')}</span>
                        <span>{skill.name}</span>
                        <motion.span className="skill-plus" animate={{ rotate: openSkill === i ? 45 : 0 }}>+</motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {openSkill === i && (
                          <motion.div id={'skill-' + i} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }}>
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
            <Heading n="04" title="Learning, in motion." sub="the journey so far" />
            <div className="journey-grid">
              <div>
                <Reveal><h3 className="column-label">EXPERIENCE & HIGHLIGHTS</h3></Reveal>
                {[...experienceData].reverse().map((e, i) => (
                  <Reveal key={e.title}>
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
                <Reveal><h3 className="column-label">EDUCATION</h3></Reveal>
                {educationData.map((e) => (
                  <Reveal key={e.title}>
                    <article className="education">
                      <span className="education-icon">↗</span>
                      <p className="meta">{e.meta}</p>
                      <h3>{e.title}</h3>
                      {e.description && <p>{e.description}</p>}
                    </article>
                  </Reveal>
                ))}
                <Reveal>
                  <div className="note-card">
                    <span className="eyebrow">A PERSONAL REMINDER</span>
                    <p>Stay a beginner.<br />Keep asking why.<br /><em>Make it matter.</em></p>
                    <span className="note-star">✳</span>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          <section id="contact" className="section contact">
            <Heading n="05" title="Start a conversation." sub="good things begin here" />
            <Reveal>
              <div className="contact-grid">
                <div>
                  <span className="eyebrow">HAVE SOMETHING IN MIND?</span>
                  <h2>Let’s make<br /><em>it happen.</em><span className="contact-star">✳</span></h2>
                  <p>Project baru, ide menarik, atau sekadar bertukar perspektif.<br />Saya selalu terbuka untuk percakapan yang baik.</p>
                  <a className="button button-dark" href={'mailto:' + personalData.email}>Say hello <Arrow /></a>
                </div>
                <div className="contact-links">
                  <span className="eyebrow">FIND ME ELSEWHERE</span>
                  {personalData.socials.map((s) => <a key={s.name} href={s.url} target="_blank" rel="noreferrer">{s.name}<Arrow /></a>)}
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
          <a href="#home" className="brand">ab<span>.</span></a>
          <span>© {new Date().getFullYear()} Abraham Benedick<br /><small>Made with curiosity. Always in progress.</small></span>
          <a href="#home" className="back-top">Back to top ↑</a>
        </footer>
      </div>

      <AnimatePresence>{selected !== null && <ProjectDialog index={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}
