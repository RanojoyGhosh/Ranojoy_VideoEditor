/* ==========================================================================
   Marquee: constant drift that speeds up with scroll velocity and follows
   scroll direction. Pauses on hover. (CSS loop is the no-JS fallback.)
   ========================================================================== */
import { gsap } from 'gsap';
import { prefersReducedMotion } from './config.js';
import { getLenis } from './lenis.js';

export function initMarquee() {
  const marquee = document.querySelector('.marquee');
  if (!marquee || prefersReducedMotion) return;
  marquee.classList.add('is-js');

  const track = marquee.querySelector('.marquee__track');
  const group = track.querySelector('.marquee__group');
  let groupW = group.offsetWidth;
  let x = 0;
  let dir = -1;           // -1 = moving left
  let hoverFactor = { v: 1 };
  const BASE = 0.6;       // px per frame at 60fps
  let inView = true;

  new ResizeObserver(() => { groupW = group.offsetWidth; }).observe(group);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(marquee);

  const lenis = getLenis();
  let velocity = 0;
  if (lenis) {
    lenis.on('scroll', (l) => {
      velocity = l.velocity;
      if (Math.abs(l.velocity) > 0.5) dir = l.direction === 1 ? -1 : 1;
    });
  }

  gsap.ticker.add((time, delta) => {
    if (!inView || !groupW) return;
    const boost = Math.min(Math.abs(velocity) * 0.35, 10);
    velocity *= 0.92;
    x += dir * (BASE + boost) * hoverFactor.v * (delta / 16.67);
    x = gsap.utils.wrap(-groupW, 0, x);
    track.style.transform = `translate3d(${x}px,0,0)`;
  });

  marquee.addEventListener('pointerenter', () => gsap.to(hoverFactor, { v: 0, duration: 0.6, ease: 'power2.out' }));
  marquee.addEventListener('pointerleave', () => gsap.to(hoverFactor, { v: 1, duration: 0.8, ease: 'power2.inOut' }));
}
