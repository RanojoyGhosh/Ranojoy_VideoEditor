/* ==========================================================================
   FAQ accordion: one open at a time, smooth height, keyboard accessible
   (buttons with aria-expanded / aria-controls; arrow keys move between items)
   ========================================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './config.js';

export function initFaq() {
  const triggers = [...document.querySelectorAll('.accordion__trigger')];
  const dur = prefersReducedMotion ? 0 : 0.6;

  const setOpen = (btn, open) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: dur, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
    } else {
      gsap.to(panel, { height: 0, duration: dur * 0.7, ease: 'power3.inOut', onComplete: () => { panel.hidden = true; ScrollTrigger.refresh(); } });
    }
  };

  triggers.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      triggers.forEach((other) => { if (other !== btn && other.getAttribute('aria-expanded') === 'true') setOpen(other, false); });
      setOpen(btn, !isOpen);
    });
    btn.addEventListener('keydown', (e) => {
      const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: triggers.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      triggers[(map[e.key] + triggers.length) % triggers.length].focus();
    });
  });
}
