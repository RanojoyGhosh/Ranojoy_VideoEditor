/* ==========================================================================
   Work lightbox: full video WITH sound + project details.
   Native <dialog> gives us focus trapping and ESC; we add animated open/close,
   click-outside, swipe-down-to-close on touch and body scroll lock.
   ========================================================================== */
import { gsap } from 'gsap';
import { asset, prefersReducedMotion } from './config.js';
import { stopScroll, startScroll, scrollToTarget } from './lenis.js';

export function initLightbox({ onOpen, onClose } = {}) {
  const dialog = document.querySelector('.lightbox');
  if (!dialog) return;
  const inner = dialog.querySelector('.lightbox__inner');
  const video = dialog.querySelector('.lightbox__video');
  const titleEl = dialog.querySelector('.lightbox__title');
  const numEl = dialog.querySelector('.lightbox__num');
  const detailsEl = dialog.querySelector('.lightbox__details');
  let lastTrigger = null;
  let closing = false;

  function open(card, trigger) {
    lastTrigger = trigger;
    const num = card.querySelector('.work-card__num')?.textContent ?? '';
    titleEl.textContent = card.dataset.title;
    numEl.textContent = `Project ${num}`;
    detailsEl.innerHTML = card.querySelector('.work-card__details')?.innerHTML ?? '';
    video.poster = asset(card.dataset.poster);
    video.src = asset(card.dataset.full);
    video.setAttribute('aria-label', `${card.dataset.title} video`);

    onOpen?.();
    stopScroll();
    dialog.showModal();
    gsap.set(inner, { clearProps: 'transform,opacity' });
    if (!prefersReducedMotion) {
      gsap.fromTo(inner, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out' });
    }
    video.muted = false;
    video.currentTime = 0;
    video.play().catch(() => { /* user can press play */ });
  }

  function close({ thenScrollTo } = {}) {
    if (closing || !dialog.open) return;
    closing = true;
    const finish = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      dialog.close();
      startScroll();
      onClose?.();
      closing = false;
      if (thenScrollTo) scrollToTarget(thenScrollTo);
      else lastTrigger?.focus({ preventScroll: true });
    };
    if (prefersReducedMotion) finish();
    else gsap.to(inner, { y: 30, autoAlpha: 0, duration: 0.35, ease: 'power2.in', onComplete: finish });
  }

  // Open from any work card
  document.querySelectorAll('.work-card__media').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.closest('.work-card'), btn));
  });

  dialog.querySelector('.lightbox__close').addEventListener('click', () => close());
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // ESC
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target === inner) close(); // click outside content
  });
  dialog.querySelector('[data-close-lightbox]')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close({ thenScrollTo: '#contact' });
  });

  // Swipe down to close (touch)
  let startY = null;
  let dy = 0;
  inner.addEventListener('touchstart', (e) => {
    if (e.target.closest('video') || inner.scrollTop > 0) { startY = null; return; }
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  inner.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    gsap.set(inner, { y: dy * 0.6, opacity: 1 - Math.min(dy / 600, 0.5) });
  }, { passive: true });
  inner.addEventListener('touchend', () => {
    if (startY === null) return;
    if (dy > 110) close();
    else gsap.to(inner, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    startY = null;
  });
}

/** Click-and-drag scrolling for the work carousel with a mouse (tablet-width desktops) */
export function initCarouselDrag() {
  const el = document.querySelector('.work__cards');
  if (!el) return;
  let down = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || el.scrollWidth <= el.clientWidth || el.closest('.is-pinned')) return;
    down = true; moved = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) { moved = true; el.classList.add('is-dragging'); }
    if (moved) el.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    el.classList.remove('is-dragging');
  });
  // Swallow the click that ends a drag so the lightbox doesn't open
  el.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
}
