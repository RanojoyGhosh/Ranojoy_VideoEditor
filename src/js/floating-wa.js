/* ==========================================================================
   Floating WhatsApp button: appears after the hero, hides while the
   contact section (which already has WhatsApp) is on screen.
   ========================================================================== */
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initFloatingWhatsApp() {
  const btn = document.querySelector('.wa-float');
  if (!btn) return;
  let pastHero = false;
  let inContact = false;
  const update = () => btn.classList.toggle('is-visible', pastHero && !inContact);

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'bottom 30%',
    end: 'max',
    onToggle: ({ isActive }) => { pastHero = isActive; update(); },
  });
  ScrollTrigger.create({
    trigger: '#contact',
    start: 'top 85%',
    end: 'max',
    onToggle: ({ isActive }) => { inContact = isActive; update(); },
  });
}
