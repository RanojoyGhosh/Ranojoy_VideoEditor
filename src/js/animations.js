/* ==========================================================================
   Scroll & reveal animations (GSAP + ScrollTrigger + SplitText)
   Every reveal plays ONCE when it enters the viewport.
   With prefers-reduced-motion everything is shown instantly (no split text,
   no pinning, no parallax); only gentle opacity fades remain.
   ========================================================================== */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { prefersReducedMotion } from './config.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = 'expo.out';
const COLORS = { 900: '#0B1F17', 800: '#12291F' };

/** Wait for web fonts (max 1 s) so text is split on its final line breaks */
export const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1000))]);

/* ---------- Hero intro: one choreographed timeline ---------- */
export function heroIntro() {
  const title = document.querySelector('.hero__title');
  const fades = document.querySelectorAll('[data-hero-fade]');
  const phones = document.querySelectorAll('[data-hero-media]');

  if (prefersReducedMotion) {
    gsap.set([title, ...fades, ...phones], { autoAlpha: 1 });
    return Promise.resolve();
  }

  const split = SplitText.create(title, { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
  const tl = gsap.timeline({ defaults: { ease: EASE } });

  tl.set(title, { autoAlpha: 1 })
    .from(split.words, { yPercent: 115, duration: 1.2, stagger: 0.06 }, 0)
    .fromTo(fades, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 0.35)
    .fromTo(phones,
      { autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', stagger: 0.12 }, 0.1)
    .from([...phones].map((p) => p.querySelector('.phone__screen')), { scale: 1.1, duration: 1.6, stagger: 0.12 }, 0.1)
    .add(() => {
      split.revert(); // restore plain text so it reflows naturally on resize
      gsap.set(phones, { clearProps: 'clipPath' });
    });

  return new Promise((resolve) => tl.eventCallback('onComplete', resolve));
}

/* ---------- Generic reveals ---------- */
function splitHeadings() {
  document.querySelectorAll('[data-split]:not(.hero__title)').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onComplete: () => split.revert(),
    });
  });
}

function fadeReveals() {
  const opts = (trigger) => ({ trigger, start: 'top 88%', once: true });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, prefersReducedMotion
      ? { autoAlpha: 0, duration: 0.6, scrollTrigger: opts(el) }
      : { autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: opts(el) });
  });

  document.querySelectorAll('[data-reveal-stagger]').forEach((el) => {
    gsap.from(el.children, prefersReducedMotion
      ? { autoAlpha: 0, duration: 0.6, scrollTrigger: opts(el) }
      : { autoAlpha: 0, y: 50, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: opts(el), clearProps: 'transform' });
  });
}

/* Image reveal: clip-path wipe + slight scale-down, then gentle parallax */
function mediaReveals() {
  document.querySelectorAll('[data-reveal-media]').forEach((fig) => {
    const frame = fig.querySelector('.about__frame');
    const pic = fig.querySelector('picture');
    gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } })
      .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
      .from(pic, { scale: 1.2, duration: 1.8, ease: EASE }, 0);

    gsap.fromTo(pic, { yPercent: -5 }, {
      yPercent: 5,
      ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------- Work: pinned horizontal scroll on desktop ---------- */
function workPin(mm) {
  const section = document.querySelector('.work');
  const track = section?.querySelector('.work__track');
  if (!track) return;

  mm.add('(min-width: 1024px)', () => {
    section.classList.add('is-pinned');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    // Cards drift in slightly as they travel across the screen
    gsap.utils.toArray('.work-card').forEach((card) => {
      gsap.from(card.querySelector('.work-card__media'), {
        rotate: 4,
        scale: 0.94,
        ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center center', scrub: true },
      });
    });

    return () => section.classList.remove('is-pinned');
  });
}

/* ---------- Quote band: words brighten one by one with scroll ---------- */
function quoteScrub() {
  const p = document.querySelector('[data-quote]');
  if (!p) return;
  const split = SplitText.create(p, { type: 'words' });
  gsap.fromTo(split.words, { opacity: 0.15 }, {
    opacity: 1,
    ease: 'none',
    stagger: 0.12,
    scrollTrigger: { trigger: '.quote', start: 'top 65%', end: 'center 40%', scrub: true },
  });
}

/* ---------- Process: timeline line draws itself ---------- */
function processLine() {
  const line = document.querySelector('.timeline__progress');
  if (!line) return;
  gsap.fromTo(line, { scaleY: 0 }, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true },
  });
  document.querySelectorAll('.timeline__step').forEach((step) => {
    ScrollTrigger.create({ trigger: step, start: 'top 70%', toggleClass: 'is-active' , end: 'max' });
  });
}

/* ---------- Background colour transitions between sections ---------- */
function backgroundShift() {
  document.querySelectorAll('[data-bg]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: ({ isActive }) => {
        if (isActive) gsap.to(document.body, { backgroundColor: COLORS[section.dataset.bg], duration: 0.9, ease: 'power2.out', overwrite: 'auto' });
      },
    });
  });
}

export function initScrollAnimations() {
  const mm = gsap.matchMedia();

  backgroundShift();
  fadeReveals();

  if (prefersReducedMotion) {
    // Everything static: show the full process line, quote at full opacity
    return;
  }

  splitHeadings();
  mediaReveals();
  workPin(mm);
  quoteScrub();
  processLine();
}
