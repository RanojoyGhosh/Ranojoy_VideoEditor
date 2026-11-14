import { useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { PROCESS } from "@/lib/data";
import { fadeUp, viewportOnce } from "@/lib/motion";
import { prefersReducedMotion } from "@/lib/lenis";

export default function Process() {
  const fillRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const fill = fillRef.current;
    const tween = gsap.fromTo(
      fill,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top 72%",
          end: "bottom 55%",
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
    <section className="process" id="process" aria-labelledby="process-title">
      <div className="container-x">
        <motion.div
          className="section-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">How we&apos;ll work</p>
          <h2 id="process-title" data-testid="process-title">
            Four steps. <em className="serif-accent">Zero</em> confusion.
          </h2>
        </motion.div>

        <div className="timeline" ref={wrapRef}>
          <span className="t-line" aria-hidden="true">
            <span className="t-line-fill" ref={fillRef} />
          </span>

          {PROCESS.map((s, i) => (
            <motion.div
              className="t-step"
              key={s.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              data-testid={`process-step-${i + 1}`}
            >
              <span className="t-num font-display" aria-hidden="true">
                0{i + 1}
              </span>
              <div className="t-body">
                <h3 className="font-display">{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
