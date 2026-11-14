/* ==========================================================================
   Navigation: hide on scroll down / show on scroll up, blurred background
   after 80px, active-section highlighting, full-screen mobile menu.
   ========================================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './config.js';
import { stopScroll, startScroll } from './lenis.js';

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  const toggle = nav.querySelector('.nav__toggle');
  const menu = document.getElementById('menu');
  const links = [...nav.querySelectorAll('.nav__link')];
  let menuOpen = false;

  // Scroll state
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 80);
      if (menuOpen) return;
      if (y > 240 && self.direction === 1) nav.classList.add('is-hidden');
      else if (self.direction === -1 || y <= 240) nav.classList.remove('is-hidden');
    },
  });
  // Show nav when anything inside it receives keyboard focus
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  // Active section
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: ({ isActive }) => {
        link.classList.toggle('is-active', isActive);
        if (isActive) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      },
    });
  });

  // Mobile menu
  const items = menu.querySelectorAll('.menu__list a, .menu__foot > *');

  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.documentElement.classList.add('menu-open');
    stopScroll();
    if (!prefersReducedMotion) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' });
      gsap.fromTo(items, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.25 });
    }
    menu.querySelector('a')?.focus({ preventScroll: true });
  }

  function closeMenu({ returnFocus = true } = {}) {
    if (!menuOpen) return;
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.documentElement.classList.remove('menu-open');
    startScroll();
    const done = () => { menu.hidden = true; gsap.set([menu, ...items], { clearProps: 'all' }); };
    if (prefersReducedMotion) done();
    else gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'expo.inOut', onComplete: done });
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) closeMenu(); });

  // Simple focus trap inside the open menu (toggle + menu links)
  document.addEventListener('keydown', (e) => {
    if (!menuOpen || e.key !== 'Tab') return;
    const focusables = [toggle, ...menu.querySelectorAll('a')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Close if resized up to desktop
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) closeMenu({ returnFocus: false }); });

  return { closeMenu: () => closeMenu({ returnFocus: false }), isMenuOpen: () => menuOpen };
}
