import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/lenis";

const ITEMS = [
  "Instagram Reels",
  "YouTube Shorts",
  "Long-form YouTube",
  "Podcast Clips",
  "Promo Videos",
  "Color Grading",
];

function Group() {
  return (
    <div className="marquee-group">
      {ITEMS.map((item) => (
        <span className="marquee-item font-display" key={item}>
          {item}
          <span className="marquee-sep" aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  const trackRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const track = trackRef.current;
    const tween = gsap.to(track, {
      xPercent: -50,
      ease: "none",
      duration: 28,
      repeat: -1,
    });

    let vel = 0;
    let ts = 1;
    let paused = false;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      vel = y - lastY;
      lastY = y;
    };
    const enter = () => (paused = true);
    const leave = () => (paused = false);
    const tick = () => {
      const target = paused ? 0 : gsap.utils.clamp(-4, 4, 1 + vel * 0.12);
      ts += (target - ts) * 0.08;
      tween.timeScale(ts);
      vel *= 0.9;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("mouseenter", enter);
    track.addEventListener("mouseleave", leave);
    gsap.ticker.add(tick);
    return () => {
      tween.kill();
      gsap.ticker.remove(tick);
      window.removeEventListener("scroll", onScroll);
      track.removeEventListener("mouseenter", enter);
      track.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track" ref={trackRef}>
        <Group />
        <Group />
      </div>
    </div>
  );
}
