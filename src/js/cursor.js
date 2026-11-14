/* ==========================================================================
   Custom cursor: small dot + lagging ring. Desktop (fine pointer) only.
   Grows over links, shows "Play" over videos and "Drag" over the carousel.
   ========================================================================== */
import { gsap } from 'gsap';
import { hasFinePointer, prefersReducedMotion } from './config.js';

export function initCursor() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const cursor = document.querySelector('.cursor');
  if (!cursor) return;
  document.documentElement.classList.add('has-cursor');

  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');
  const label = cursor.querySelector('.cursor__label');

  const dotX = gsap.quickSetter(dot, 'x', 'px');
  const dotY = gsap.quickSetter(dot, 'y', 'px');
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

  gsap.set([dot, ring], { x: -100, y: -100 });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    cursor.classList.remove('is-hidden');
    dotX(e.clientX); dotY(e.clientY);
    ringX(e.clientX); ringY(e.clientY);
  }, { passive: true });

  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    const labelled = t.closest('[data-cursor]');
    let text = '';
    if (labelled) {
      const type = labelled.dataset.cursor;
      if (type === 'play') text = 'Play';
      // "Drag" only where the carousel is actually draggable (not pinned, overflowing)
      if (type === 'drag' && !labelled.closest('.is-pinned') && labelled.scrollWidth > labelled.clientWidth + 4) text = 'Drag';
      if (type === 'drag' && t.closest('[data-cursor="play"]')) text = 'Play';
    }
    label.textContent = text;
    cursor.classList.toggle('is-label', !!text);
    cursor.classList.toggle('is-link', !text && !!t.closest('a, button, select, label, summary'));
  });
}
