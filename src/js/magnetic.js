/* ==========================================================================
   Magnetic buttons (follow the cursor within ~12px) + text-roll labels
   ========================================================================== */
import { gsap } from 'gsap';
import { hasFinePointer, prefersReducedMotion } from './config.js';

/** Turns <span class="js-roll">Label</span> into a two-layer rolling label */
export function initTextRoll() {
  document.querySelectorAll('.js-roll').forEach((el) => {
    const text = el.textContent.trim();
    el.classList.add('roll');
    el.innerHTML = '';
    const a = document.createElement('span');
    a.className = 'roll__a';
    a.textContent = text;
    const b = document.createElement('span');
    b.className = 'roll__b';
    b.textContent = text;
    b.setAttribute('aria-hidden', 'true');
    el.append(a, b);
  });
}

export function initMagnetic() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const MAX = 12;
  document.querySelectorAll('.js-magnetic').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      xTo(gsap.utils.clamp(-MAX, MAX, dx * MAX));
      yTo(gsap.utils.clamp(-MAX, MAX, dy * MAX * 0.8));
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    });
  });
}
