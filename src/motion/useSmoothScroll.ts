import { useEffect } from 'react';
import Lenis from 'lenis';

/* Cinematic scroll: heavier and slower than the browser default, so the page
   carries momentum instead of snapping. Lenis drives the real window scroll,
   which keeps framer-motion's useScroll and every IntersectionObserver honest. */

let instance: Lenis | null = null;

export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.85,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
      wheelMultiplier: 0.72,
      touchMultiplier: 1.25,
      smoothWheel: true,
      syncTouch: false,
    });
    instance = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // CSS smooth-scroll fights Lenis for the same gesture.
    const html = document.documentElement;
    const prior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      instance = null;
      html.style.scrollBehavior = prior;
    };
  }, [enabled]);
}

export function smoothTo(target: HTMLElement | number, offset = 0) {
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    if (typeof target === 'number') window.scrollTo(0, target);
    else target.scrollIntoView({ block: 'start' });
    return;
  }
  if (instance) {
    instance.scrollTo(target, { offset, duration: 2.1 });
    return;
  }
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
  else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
}

export function stopScroll() {
  instance?.stop();
}
export function startScroll() {
  instance?.start();
}
