import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis = null;

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function getLenis() {
  return lenis;
}

export function lockScroll(lock) {
  if (lenis) {
    lock ? lenis.stop() : lenis.start();
  }
  document.documentElement.style.overflow = lock ? "hidden" : "";
}

export function scrollToTarget(target, offset = -76) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.15 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
