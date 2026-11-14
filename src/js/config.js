/* ==========================================================================
   Site-wide settings. Change the WhatsApp number here (international format,
   digits only, no "+" or spaces).
   ========================================================================== */
export const WHATSAPP_NUMBER = '919382290197';

export const DEFAULT_WA_TEXT = 'Hi Ranojoy, I saw your portfolio and want to discuss a video project.';

/** Builds a wa.me link with a pre-filled message */
export const waLink = (text = DEFAULT_WA_TEXT) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/** Resolves a path in /public (e.g. "assets/videos/x.mp4") against the deploy base URL */
export const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
