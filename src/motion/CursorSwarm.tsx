import { useEffect, useRef, useState } from 'react';

/* ───────────────────────────────────────────────────────────
   Cursor swarm — a crew that builds the whole page.

   The order of operations is the point: for any block of text a
   cursor first pulls an empty container open, Figma style, and
   only once that box is set do other cursors fill it in — one
   cursor per character, never a word or a pair at a time. Digits
   count as characters.

   Phase 1  hero      pinned at the top: the name is carried in
                      letter by letter, the portrait photo is
                      flown into its frame, the theme switch is
                      wired, the buttons are built.
   Phase 2  descent   the page scrolls itself down; each section
                      is boxed and then typed out as it rises in.
                      The scroll slows whenever the crew is behind,
                      so the two stay together down to the footer.
   Phase 3  return    the page eases back to the top.
   Phase 4  release   the visitor takes over.
   ─────────────────────────────────────────────────────────── */

type Carry = 'box' | 'frame' | 'glyph' | 'photo' | 'type';

type Spec = {
  sel: string;
  carry?: Carry;
  verb: string;
  all?: boolean;
  hero?: boolean;
  dwell?: number;
  /** split this element's text into one target per character */
  chars?: boolean;
  /** hold until the enclosing element's own target is set */
  within?: string;
};

const SCRIPT: Spec[] = [
  /* ── chrome, built while the page is pinned ─────────────── */
  { sel: '.header', carry: 'frame', verb: 'framing header', hero: true, dwell: 760 },
  { sel: '.header .brand', carry: 'type', verb: 'drawing mark', hero: true, dwell: 520, within: '.header' },
  { sel: '.desktop-nav a', carry: 'box', verb: 'boxing', all: true, hero: true, dwell: 420, within: '.header' },
  { sel: '.theme-toggle', carry: 'box', verb: 'wiring switch', hero: true, dwell: 900, within: '.header' },
  { sel: '.nav-contact', carry: 'box', verb: 'building button', hero: true, dwell: 700, within: '.header' },

  /* ── hero ───────────────────────────────────────────────── */
  { sel: '.hero-topline', carry: 'frame', verb: 'framing', hero: true, dwell: 560 },
  { sel: '.portrait', carry: 'frame', verb: 'framing', hero: true, dwell: 900 },
  { sel: '.portrait-photo', carry: 'photo', verb: 'placing photo', hero: true, dwell: 1500, within: '.portrait' },
  { sel: '.name-glyph', carry: 'glyph', verb: 'carrying', all: true, hero: true, dwell: 560 },
  { sel: '.portrait-corner', carry: 'type', verb: 'labelling', hero: true, dwell: 420, within: '.portrait' },
  { sel: '.portrait-caption', carry: 'type', verb: 'writing', hero: true, dwell: 520, within: '.portrait' },
  { sel: '.spatial-stage', carry: 'box', verb: 'placing object', hero: true, dwell: 760 },
  { sel: '.art-note', carry: 'box', verb: 'noting', hero: true, dwell: 560 },
  { sel: '.hero-description', carry: 'frame', verb: 'framing copy', hero: true, dwell: 700 },
  { sel: '.button-dark', carry: 'frame', verb: 'building button', hero: true, dwell: 820 },
  { sel: '.quiet-link', carry: 'frame', verb: 'building link', hero: true, dwell: 620 },
  { sel: '.hero-footer', carry: 'frame', verb: 'padding', hero: true, dwell: 700 },

  /* ── everything below is boxed, then typed, on the descent ─ */
  { sel: '.section-heading', carry: 'frame', verb: 'framing', all: true, dwell: 700 },
  { sel: '.number', carry: 'type', verb: 'numbering', all: true, dwell: 110, chars: true, within: '.section-heading' },
  { sel: '.heading-char', carry: 'type', verb: 'typing', all: true, dwell: 100, within: '.section-heading' },
  { sel: '.section-sub', carry: 'type', verb: 'writing', all: true, dwell: 70, chars: true, within: '.section-heading' },

  { sel: '.eyebrow', carry: 'type', verb: 'labelling', all: true, dwell: 70, chars: true },
  { sel: '.statement', carry: 'frame', verb: 'framing', all: true, dwell: 620 },
  { sel: '.mag-char', carry: 'type', verb: 'typing', all: true, dwell: 100, within: '.statement' },
  { sel: '.outline-fill', carry: 'type', verb: 'outlining', all: true, dwell: 420, within: '.statement' },

  { sel: '.intro-copy p', carry: 'box', verb: 'writing', all: true, dwell: 380 },
  { sel: '.inline-link', carry: 'frame', verb: 'building link', all: true, dwell: 440 },
  { sel: '.column-label', carry: 'type', verb: 'labelling', all: true, dwell: 70, chars: true },
  { sel: '.toolkit-mark', carry: 'box', verb: 'drawing', all: true, dwell: 480 },

  { sel: '.ticker', carry: 'frame', verb: 'framing marquee', all: true, dwell: 760 },
  { sel: '.ticker-caption', carry: 'type', verb: 'labelling', all: true, dwell: 320, within: '.ticker' },
  { sel: '.ticker-item', carry: 'type', verb: 'setting type', all: true, dwell: 150, within: '.ticker' },

  { sel: '.work-intro', carry: 'frame', verb: 'framing', all: true, dwell: 560 },
  { sel: '.filters button', carry: 'box', verb: 'boxing', all: true, dwell: 260, within: '.work-intro' },
  { sel: '.project-card', carry: 'frame', verb: 'framing card', all: true, dwell: 620 },
  { sel: '.project-info h3', carry: 'type', verb: 'titling', all: true, dwell: 300, within: '.project-card' },
  { sel: '.tags span', carry: 'box', verb: 'tagging', all: true, dwell: 150, within: '.project-card' },

  { sel: '.skill-item', carry: 'box', verb: 'listing', all: true, dwell: 300 },
  { sel: '.timeline-item', carry: 'frame', verb: 'placing', all: true, dwell: 380 },
  { sel: '.education', carry: 'box', verb: 'placing', all: true, dwell: 330 },
  { sel: '.note-card', carry: 'frame', verb: 'padding', all: true, dwell: 620 },

  { sel: '.contact h2', carry: 'frame', verb: 'framing', all: true, dwell: 700 },
  { sel: '.contact-links > a', carry: 'box', verb: 'linking', all: true, dwell: 260 },
  { sel: '.email-block', carry: 'box', verb: 'writing', all: true, dwell: 380 },
  { sel: 'footer > *', carry: 'box', verb: 'closing', all: true, dwell: 340 },
];

const NAMES = [
  'ab', 'nova', 'kite', 'relay', 'atlas', 'muse', 'echo', 'vela',
  'pike', 'juno', 'halo', 'wren', 'flux', 'onyx',
];
const POOL = 14;
/* Deliberately low: the crew should read as a few people working
   carefully, not a cloud of pointers. */
const BUSY = { hero: 3, descent: 6 };

type Target = {
  el: HTMLElement;
  carry: Carry;
  verb: string;
  dwell: number;
  hero: boolean;
  x: number; y: number; w: number; h: number;
  dep: Target | null;
  ghost: HTMLElement | null;
  taken: boolean;
  set: boolean;
};

type Agent = {
  el: HTMLDivElement;
  chipVerb: HTMLElement;
  x: number; y: number; vx: number; vy: number;
  target: Target | null;
  state: 'park' | 'work' | 'haul';
  until: number;
  park: { x: number; y: number };
  gx: number; gy: number;
  hue: number;
};

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Wrap every visible character of an element in its own span so each
   one can be carried by its own cursor. Digits included. */
function splitChars(el: HTMLElement) {
  if (el.dataset.swSplit) return;
  el.dataset.swSplit = '1';
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n = walk.nextNode();
  while (n) {
    if (n.nodeValue && n.nodeValue.trim()) texts.push(n as Text);
    n = walk.nextNode();
  }
  for (const t of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of t.nodeValue ?? '') {
      if (ch === ' ') {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      const s = document.createElement('span');
      s.className = 'sw-ch';
      s.textContent = ch;
      frag.appendChild(s);
    }
    t.parentNode?.replaceChild(frag, t);
  }
}

export default function CursorSwarm({ onDone }: { onDone: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const phaseEl = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const closed = useRef(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
      onDone();
      return;
    }
    const host = stage.current;
    if (!host) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const body = document.body;
    const root = document.documentElement;

    let raf = 0;
    let cancelled = false;

    const finish = (instant = false) => {
      if (closed.current) return;
      closed.current = true;
      body.classList.remove('sw-armed');
      root.style.scrollBehavior = '';
      setLeaving(true);
      window.setTimeout(onDone, instant ? 200 : 520);
    };

    const block = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'Escape') finish(true);
    };

    const boot = window.setTimeout(() => {
      if (cancelled) return;

      body.classList.add('sw-armed');
      // The stylesheet sets scroll-behavior:smooth; left on, every per-frame
      // scrollTo restarts a smooth animation and the page never travels.
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      window.addEventListener('wheel', block, { passive: false });
      window.addEventListener('touchmove', block, { passive: false });
      window.addEventListener('keydown', blockKeys);

      // characters first, so the per-char targets exist before measuring
      for (const spec of SCRIPT) {
        if (!spec.chars) continue;
        document.querySelectorAll<HTMLElement>(spec.sel).forEach(splitChars);
      }

      const targets: Target[] = [];
      const byEl = new Map<HTMLElement, Target>();
      const pending: { t: Target; within: string }[] = [];

      for (const spec of SCRIPT) {
        const sel = spec.chars ? `${spec.sel} .sw-ch` : spec.sel;
        const nodes = spec.all || spec.chars
          ? Array.from(document.querySelectorAll<HTMLElement>(sel))
          : ([document.querySelector<HTMLElement>(sel)].filter(Boolean) as HTMLElement[]);

        for (const el of nodes) {
          if (byEl.has(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          el.setAttribute('data-sw', '');
          const t: Target = {
            el,
            carry: spec.carry ?? 'box',
            verb: spec.verb,
            dwell: spec.dwell ?? 300,
            hero: !!spec.hero,
            x: r.left,
            y: r.top + window.scrollY,
            w: r.width,
            h: r.height,
            dep: null,
            ghost: null,
            taken: false,
            set: false,
          };
          targets.push(t);
          byEl.set(el, t);
          if (spec.within) pending.push({ t, within: spec.within });
        }
      }

      // a character cannot be written until its container has been boxed
      for (const { t, within } of pending) {
        const host2 = t.el.closest<HTMLElement>(within);
        if (host2 && host2 !== t.el) t.dep = byEl.get(host2) ?? null;
      }

      if (!targets.length) {
        finish(true);
        return;
      }

      // document order: top to bottom, then left to right, so text reads
      targets.sort((a, b) =>
        a.hero === b.hero ? a.y - b.y || a.x - b.x : a.hero ? -1 : 1,
      );
      const total = targets.length;

      const makeGhost = (t: Target): HTMLElement => {
        const g = document.createElement('div');
        g.className = `sw-ghost sw-${t.carry}`;
        g.style.width = `${t.w}px`;
        g.style.height = `${t.h}px`;
        if (t.carry === 'glyph') {
          const cs = getComputedStyle(t.el);
          g.textContent = t.el.textContent;
          g.style.font = cs.font;
          g.style.fontWeight = cs.fontWeight;
          g.style.fontSize = cs.fontSize;
          g.style.fontFamily = cs.fontFamily;
          g.style.letterSpacing = cs.letterSpacing;
          g.style.lineHeight = cs.lineHeight;
          g.style.color = cs.color;
        } else if (t.carry === 'photo') {
          const src = (t.el as HTMLImageElement).src;
          if (src) {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            g.appendChild(img);
          }
        }
        host.appendChild(g);
        return g;
      };

      const agents: Agent[] = [];
      for (let i = 0; i < POOL; i++) {
        const el = document.createElement('div');
        el.className = 'sw-cursor';
        el.style.color = `var(--sw-${i % 8})`;
        el.innerHTML = `
          <svg width="19" height="22" viewBox="0 0 20 23" fill="none" aria-hidden="true">
            <path d="M1.5 1.3 17.2 11.6l-6.9.9-3.5 6.1-5.3-17.3Z" fill="currentColor" stroke="var(--paper)" stroke-width="1.4" stroke-linejoin="round"/>
          </svg>
          <span class="sw-chip">${NAMES[i % NAMES.length]}<i></i></span>`;
        host.appendChild(el);

        const side = i % 4;
        const park =
          side === 0 ? { x: -90 - Math.random() * 120, y: vh * Math.random() } :
          side === 1 ? { x: vw + 90 + Math.random() * 120, y: vh * Math.random() } :
          side === 2 ? { x: vw * Math.random(), y: -90 - Math.random() * 90 } :
                       { x: vw * Math.random(), y: vh + 90 + Math.random() * 90 };

        agents.push({
          el,
          chipVerb: el.querySelector('i') as HTMLElement,
          x: park.x,
          y: park.y,
          vx: 0, vy: 0,
          target: null,
          state: 'park',
          until: 0,
          park,
          gx: 0, gy: 0,
          hue: i % 8,
        });
      }

      let phase: 'hero' | 'descent' | 'return' = 'hero';
      let scrollPos = 0;
      let rate = 0;
      let returnFrom = 0;
      let returnAt = 0;
      let built = 0;
      let last = performance.now();
      const maxScroll = () => root.scrollHeight - vh;

      const ready = (t: Target) => !t.dep || t.dep.set;

      const pickFor = () => {
        let blockedAhead = false;
        for (const t of targets) {
          if (t.taken || t.set) continue;
          if (phase === 'hero' && !t.hero) break;
          if (phase !== 'hero' && t.hero) continue;
          if (!ready(t)) {
            // its container is still being drawn — wait, do not jump ahead
            blockedAhead = true;
            continue;
          }
          if (phase === 'descent' && t.y > scrollPos + vh * 1.15) break;
          return t;
        }
        void blockedAhead;
        return null;
      };

      const frame = (now: number) => {
        if (cancelled) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        let busyInBand = 0;
        let busy = agents.reduce((n, a) => n + (a.target ? 1 : 0), 0);
        const cap = phase === 'hero' ? BUSY.hero : BUSY.descent;

        for (const a of agents) {
          if (!a.target && phase !== 'return' && busy < cap) {
            const t = pickFor();
            if (t) {
              busy++;
              t.taken = true;
              a.target = t;
              a.chipVerb.textContent = t.verb;
              a.until = now + t.dwell;
              t.ghost = makeGhost(t);
              if (t.carry === 'glyph' || t.carry === 'photo') {
                // fetched from off-stage and hauled home
                const fromLeft = Math.random() < 0.5;
                a.gx = fromLeft ? -t.w - 90 - Math.random() * 200 : vw + 90 + Math.random() * 200;
                a.gy = t.y + (Math.random() - 0.5) * 240;
                a.x = a.gx;
                a.y = a.gy;
                a.state = 'haul';
              } else {
                a.state = 'work';
              }
            }
          }

          const t = a.target;
          let tx: number, ty: number;

          if (!t) {
            tx = a.park.x;
            ty = a.park.y + scrollPos;
          } else {
            if (t.y + t.h > scrollPos && t.y < scrollPos + vh) busyInBand++;
            const p = clamp01(1 - (a.until - now) / t.dwell);
            const e = easeInOutCubic(p);

            if (a.state === 'haul') {
              const cx = a.gx + (t.x - a.gx) * e;
              const cy = a.gy + (t.y - a.gy) * e;
              if (t.ghost) {
                t.ghost.style.transform = `translate3d(${cx}px, ${cy - scrollPos}px, 0)`;
                t.ghost.style.opacity = '1';
              }
              tx = cx + Math.min(t.w * 0.5, 26);
              ty = cy + Math.min(t.h * 0.4, 18);
            } else {
              // the container is pulled open from its centre
              const w = t.w * (0.14 + 0.86 * e);
              const h = t.h * (0.14 + 0.86 * e);
              const cx = t.x + (t.w - w) / 2;
              const cy = t.y + (t.h - h) / 2;
              if (t.ghost) {
                t.ghost.style.width = `${w}px`;
                t.ghost.style.height = `${h}px`;
                t.ghost.style.transform = `translate3d(${cx}px, ${cy - scrollPos}px, 0)`;
                t.ghost.style.opacity = String(Math.min(1, p * 4));
              }
              tx = cx + Math.min(w * 0.5, 150);
              ty = cy + Math.min(h * 0.45, 40);
            }

            tx += Math.sin(now / 190 + a.hue) * 2.2;
            ty += Math.cos(now / 235 + a.hue) * 1.8;

            if (now >= a.until) {
              t.el.classList.add('sw-set');
              t.set = true;
              built++;
              if (t.ghost) {
                const g = t.ghost;
                g.classList.add('sw-pop');
                window.setTimeout(() => g.remove(), 300);
                t.ghost = null;
              }
              a.target = null;
              a.state = 'park';
              a.chipVerb.textContent = '';
            }
          }

          // unhurried pursuit — the crew should never look rushed
          const stiff = a.target ? 46 : 22;
          const damp = Math.pow(a.target ? 0.82 : 0.89, dt * 60);
          a.vx = (a.vx + (tx - a.x) * stiff * dt) * damp;
          a.vy = (a.vy + (ty - a.y) * stiff * dt) * damp;
          a.x += a.vx * dt;
          a.y += a.vy * dt;

          const sy = a.y - scrollPos;
          a.el.style.transform = `translate3d(${a.x}px, ${sy}px, 0)`;
          a.el.style.opacity = a.target && sy > -130 && sy < vh + 130 ? '1' : '0';
        }

        const heroLeft = targets.some((t) => t.hero && !t.set);

        if (phase === 'hero') {
          scrollPos = 0;
          window.scrollTo(0, 0);
          if (!heroLeft) {
            phase = 'descent';
            if (phaseEl.current) phaseEl.current.textContent = 'building page';
          }
        } else if (phase === 'descent') {
          // The page never leaves unfinished work behind it: if anything above
          // the middle of the viewport is still unbuilt the scroll holds,
          // otherwise it travels at a steady, readable pace.
          const laggard = targets.some((t) => !t.set && t.y + t.h < scrollPos + vh * 0.55);
          const want = laggard ? 0 : 520;
          rate += (want - rate) * Math.min(1, dt * 3);
          void busyInBand;
          scrollPos = Math.min(maxScroll(), scrollPos + rate * dt);
          window.scrollTo(0, scrollPos);

          if (scrollPos >= maxScroll() - 1 && targets.every((t) => t.set)) {
            phase = 'return';
            returnFrom = scrollPos;
            returnAt = now;
            if (phaseEl.current) phaseEl.current.textContent = 'handing over';
          }
        } else {
          const p = clamp01((now - returnAt) / 4200);
          scrollPos = returnFrom * (1 - easeInOutCubic(p));
          window.scrollTo(0, scrollPos);
          if (p >= 1) {
            finish();
            return;
          }
        }

        if (readout.current) {
          readout.current.textContent = String(Math.round((built / total) * 100)).padStart(3, '0');
        }
        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    }, 440);

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', blockKeys);
      body.classList.remove('sw-armed');
      root.style.scrollBehavior = '';
      host.querySelectorAll('.sw-ghost, .sw-cursor').forEach((n) => n.remove());
    };
  }, [onDone]);

  return (
    <div className={`swarm ${leaving ? 'is-leaving' : ''}`} aria-hidden="true">
      <div className="sw-stage" ref={stage} />
      <div className="sw-hud">
        <span className="sw-hud-label"><span ref={phaseEl}>assembling interface</span></span>
        <span className="sw-hud-count"><span ref={readout}>000</span> / 100</span>
      </div>
      <button
        className="sw-skip"
        onClick={() => {
          if (closed.current) return;
          closed.current = true;
          document.body.classList.remove('sw-armed');
          document.documentElement.style.scrollBehavior = '';
          setLeaving(true);
          window.setTimeout(onDone, 200);
        }}
      >
        skip build <kbd>esc</kbd>
      </button>
    </div>
  );
}
