/* ==========================================================================
   Lenis smooth scroll, synced with GSAP ScrollTrigger.
   Disabled entirely when the visitor prefers reduced motion.
   ========================================================================== */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './config.js';

let lenis = null;

export function initLenis() {
  if (prefersReducedMotion) return null;

  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;

/** Smoothly scroll to an element / selector / number, with or without Lenis */
export function scrollToTarget(target, { immediate = false } = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (lenis) {
    lenis.scrollTo(el ?? 0, { offset: 0, immediate, duration: 1.4 });
    return;
  }
  if (el instanceof Element) el.scrollIntoView({ behavior: immediate || prefersReducedMotion ? 'auto' : 'smooth' });
  else window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

export const stopScroll = () => {
  lenis?.stop();
  document.documentElement.classList.add('is-locked');
};
export const startScroll = () => {
  lenis?.start();
  document.documentElement.classList.remove('is-locked');
};

/** All in-page anchor links (#id) scroll smoothly; also moves focus for keyboard users */
export function initAnchorLinks(beforeScroll) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    if (id === '#' || id === '#main') return; // skip-link keeps native behaviour
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    beforeScroll?.(link);
    scrollToTarget(id === '#top' ? 0 : target);
    if (target !== document.body) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });
}
