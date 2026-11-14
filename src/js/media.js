/* ==========================================================================
   Video loading & playback rules
   - Videos have no src until they come near the viewport (IntersectionObserver).
   - Hero previews autoplay (muted) once the intro has played.
   - Work cards: play on hover (mouse) or when mostly in view (touch).
   - Anything that leaves the viewport is paused.
   ========================================================================== */
import { asset, hasFinePointer, prefersReducedMotion } from './config.js';

const loaded = new WeakSet();

export function loadVideo(video) {
  if (loaded.has(video) || !video.dataset.src) return;
  video.src = asset(video.dataset.src);
  video.preload = 'auto';
  loaded.add(video);
}

export function playVideo(video) {
  loadVideo(video);
  const p = video.play();
  if (p) p.catch(() => { /* autoplay blocked or interrupted: poster stays visible */ });
}

export function initVideos({ heroReady }) {
  const heroVideos = [...document.querySelectorAll('.hero video[data-src]')];
  const cardVideos = [...document.querySelectorAll('.work-card video[data-src]')];
  const visible = new Set();

  // 1. Lazy-load: attach src shortly before a video scrolls into view
  const loader = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { loadVideo(e.target); loader.unobserve(e.target); }
    });
  }, { rootMargin: '300px 0px' });
  [...heroVideos, ...cardVideos].forEach((v) => loader.observe(v));

  // 2. Visibility-driven playback
  const autoplayCards = !hasFinePointer; // touch devices: play when in view
  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      const isHero = heroVideos.includes(v);
      if (e.isIntersecting && e.intersectionRatio >= (isHero ? 0.15 : 0.6)) {
        visible.add(v);
        if (prefersReducedMotion) return;
        if (isHero && heroReady()) playVideo(v);
        if (!isHero && autoplayCards) playVideo(v);
      } else {
        visible.delete(v);
        v.pause();
      }
    });
  }, { threshold: [0, 0.15, 0.6] });
  [...heroVideos, ...cardVideos].forEach((v) => watcher.observe(v));

  // 3. Hover-to-play on mouse devices
  if (hasFinePointer) {
    document.querySelectorAll('.work-card__media').forEach((btn) => {
      const v = btn.querySelector('video');
      btn.addEventListener('pointerenter', () => playVideo(v));
      btn.addEventListener('pointerleave', () => v.pause());
      btn.addEventListener('focus', () => loadVideo(v));
    });
  }

  // Pause everything while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...heroVideos, ...cardVideos].forEach((v) => v.pause());
  });

  return {
    /** Called after the hero intro: start hero previews that are on screen */
    startHero() {
      if (prefersReducedMotion) return;
      heroVideos.forEach((v) => {
        // Only play videos that are actually displayed (mobile shows one phone)
        if (v.offsetParent !== null && (visible.has(v) || v.getBoundingClientRect().top < innerHeight)) playVideo(v);
      });
    },
    pauseAll() { [...heroVideos, ...cardVideos].forEach((v) => v.pause()); },
  };
}
