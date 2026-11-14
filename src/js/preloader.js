/* ==========================================================================
   Preloader: first visit per session only, ≤ 1.5 s.
   Resolves when the curtain starts lifting so the hero can animate in.
   ========================================================================== */
import { gsap } from 'gsap';

export function runPreloader() {
  const root = document.documentElement;
  const el = document.querySelector('.preloader');
  if (!root.classList.contains('is-preloading') || !el) return Promise.resolve();

  try { sessionStorage.setItem('rg-preloaded', '1'); } catch (e) { /* private mode */ }

  return new Promise((resolve) => {
    const counter = el.querySelector('.js-count');
    const count = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        root.classList.remove('is-preloading');
        gsap.set(el, { clearProps: 'all' });
      },
    });

    // Total ≈ 1.45 s (brief: never longer than 1.5 s)
    tl.to('.preloader__mark text', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
      .to('.preloader__mark text', { fill: 'rgba(232,220,196,1)', duration: 0.25, ease: 'power1.out' }, 0.6)
      .to(count, {
        v: 100,
        duration: 0.85,
        ease: 'power2.inOut',
        onUpdate: () => { counter.textContent = Math.round(count.v); },
      }, 0)
      .to('.preloader__inner', { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' }, 0.85)
      .add(resolve, 0.95)
      .to(el, { yPercent: -100, duration: 0.6, ease: 'expo.inOut' }, 0.85);
  });
}
