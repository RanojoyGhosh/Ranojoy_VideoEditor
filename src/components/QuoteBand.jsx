import { useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/lenis";

const WORDS = ["Every", "client", "brief", "is", "a", "story", "waiting", "to", "be", "told."];
const ACCENT = new Set(["client", "story"]);

export default function QuoteBand() {
  const sectionRef = useRef(null);
  const wordsRef = useRef([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      wordsRef.current,
      { opacity: 0.14 },
      {
        opacity: 1,
        stagger: 0.07,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
          end: "top 22%",
          scrub: 0.6,
        },
      }
    );
    return () => {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
    };
  }, []);

  return (
    <section className="quote-band" ref={sectionRef} aria-label="Every client brief is a story waiting to be told.">
      <p className="quote-line font-display" data-testid="quote-band">
        {WORDS.map((w, i) => (
          <span
            key={i}
            ref={(el) => (wordsRef.current[i] = el)}
            className={ACCENT.has(w) ? "q-word serif-accent" : "q-word"}
            aria-hidden="true"
          >
            {w}
          </span>
        ))}
      </p>
    </section>
  );
}
