import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { scrollToTarget } from "@/lib/lenis";
import { EASE } from "@/lib/motion";
import { PROJECTS } from "@/lib/data";
import Magnetic from "./Magnetic";

const LINES = [
  <>I turn raw footage</>,
  <>into videos people</>,
  <><em className="serif-accent">can&rsquo;t</em> scroll past.</>,
];

function PhoneFrame({ project, className, ready, delay, reduce }) {
  return (
    <motion.div
      className={`phone-frame ${className}`}
      initial={reduce ? false : { opacity: 0, y: 56 }}
      animate={ready ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.95, ease: EASE, delay }}
    >
      <video
        src={project.preview}
        poster={project.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`${project.title} — preview reel`}
        data-testid={`hero-phone-${project.num}`}
      />
    </motion.div>
  );
}

export default function Hero({ ready }) {
  const reduce = useReducedMotion();
  const visualRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: visualRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [34, -34]);

  return (
    <section className="hero" id="top" aria-label="Intro">
      <div className="container-x hero-grid">
        <div className="hero-copy">
          <motion.p
            className="hero-eyebrow"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
          >
            <span className="status-dot" aria-hidden="true" />
            <span>Available for projects</span>
            <span className="eyebrow-sep">·</span>
            <span>Ranojoy Ghosh — Video Editor</span>
          </motion.p>

          <h1 className="hero-title font-display" data-testid="hero-headline">
            {LINES.map((line, i) => (
              <span className="mask-line" key={i}>
                <motion.span
                  initial={reduce ? false : { y: "112%" }}
                  animate={ready ? { y: "0%" } : {}}
                  transition={{ duration: 0.95, ease: EASE, delay: 0.12 + i * 0.1 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="hero-sub"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          >
            Video Editor for creators, brands &amp; businesses — Reels, Shorts,
            YouTube, Podcasts &amp; Promos.
          </motion.p>

          <motion.div
            className="hero-ctas"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
          >
            <Magnetic>
              <button
                className="btn btn-primary"
                onClick={() => scrollToTarget("#contact")}
                data-testid="hero-start-project"
              >
                <span className="roll">
                  <span>Start a Project</span>
                  <span>Start a Project</span>
                </span>
              </button>
            </Magnetic>
            <button
              className="btn btn-ghost"
              onClick={() => scrollToTarget("#work")}
              data-testid="hero-view-work"
            >
              View My Work <ArrowDown size={16} aria-hidden="true" />
            </button>
          </motion.div>
        </div>

        <motion.div
          className="hero-visual"
          ref={visualRef}
          style={reduce ? undefined : { y }}
        >
          <motion.div
            className="portrait-card"
            initial={reduce ? false : { clipPath: "inset(100% 0 0 0)" }}
            animate={ready ? { clipPath: "inset(0% 0 0 0)" } : {}}
            transition={{ duration: 1.05, ease: EASE, delay: 0.3 }}
          >
            <motion.img
              src={`${process.env.PUBLIC_URL}/assets/images/profile.webp`}
              alt="Black-and-white portrait of Ranojoy Ghosh, video editor"
              initial={reduce ? false : { scale: 1.12 }}
              animate={ready ? { scale: 1 } : {}}
              transition={{ duration: 1.3, ease: EASE, delay: 0.3 }}
            />
          </motion.div>

          <PhoneFrame
            project={PROJECTS[0]}
            className="phone-a"
            ready={ready}
            delay={0.55}
            reduce={reduce}
          />
          <PhoneFrame
            project={PROJECTS[1]}
            className="phone-b"
            ready={ready}
            delay={0.7}
            reduce={reduce}
          />
        </motion.div>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <span className="scroll-line" />
      </div>
    </section>
  );
}
