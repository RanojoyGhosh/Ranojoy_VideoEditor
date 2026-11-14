/* ==========================================================================
   Entry point: fonts, styles and feature modules
   ========================================================================== */
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/poppins/latin-600.css'; // fallback if Clash Display can't load
import './styles/main.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initLenis, initAnchorLinks, scrollToTarget } from './js/lenis.js';
import { runPreloader } from './js/preloader.js';
import { initNav } from './js/nav.js';
import { heroIntro, initScrollAnimations, fontsReady } from './js/animations.js';
import { initCursor } from './js/cursor.js';
import { initMagnetic, initTextRoll } from './js/magnetic.js';
import { initMarquee } from './js/marquee.js';
import { initVideos } from './js/media.js';
import { initLightbox, initCarouselDrag } from './js/work-lightbox.js';
import { initFaq } from './js/faq.js';
import { initContactForm } from './js/contact-whatsapp.js';
import { initFloatingWhatsApp } from './js/floating-wa.js';

gsap.registerPlugin(ScrollTrigger);

// Always start at the top on reload (the pinned section makes restored positions unreliable)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

let heroDone = false;

async function init() {
  initTextRoll();
  initLenis();
  const nav = initNav();
  initAnchorLinks(() => { if (nav.isMenuOpen()) nav.closeMenu(); });
  initCursor();
  initMagnetic();
  initMarquee();
  initFaq();
  initContactForm();
  initCarouselDrag();

  const videos = initVideos({ heroReady: () => heroDone });
  initLightbox({ onOpen: videos.pauseAll });

  document.querySelector('[data-back-to-top]')?.addEventListener('click', () => scrollToTarget(0));

  await Promise.all([runPreloader(), fontsReady()]);
  initScrollAnimations();
  initFloatingWhatsApp();
  await heroIntro();
  heroDone = true;
  videos.startHero();
  ScrollTrigger.refresh();
}

init();
