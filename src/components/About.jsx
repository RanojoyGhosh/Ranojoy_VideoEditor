import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Gauge, Scissors, Target, MessagesSquare } from "lucide-react";
import { fadeUp, stagger, viewportOnce } from "@/lib/motion";

const WHY = [
  { icon: Gauge, text: "Retention-first pacing" },
  { icon: Scissors, text: "Clean, smooth transitions" },
  { icon: Target, text: "Edits tailored to platform & audience" },
  { icon: MessagesSquare, text: "Fast, clear communication" },
];

export default function About() {
  const reduce = useReducedMotion();
  const photoRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="container-x about-grid">
        <motion.div
          className="about-photo-wrap"
          ref={photoRef}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div className="about-photo" style={reduce ? undefined : { y }}>
            <img
              src={`${process.env.PUBLIC_URL}/assets/images/profile.webp`}
              alt="Ranojoy Ghosh, video editor"
              loading="lazy"
              width="760"
              height="1076"
              data-testid="about-photo"
            />
          </motion.div>
          <span className="about-photo-line" aria-hidden="true" />
        </motion.div>

        <motion.div
          className="about-copy"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.p className="eyebrow" variants={fadeUp}>
            About me
          </motion.p>
          <motion.h2 className="font-display" id="about-title" variants={fadeUp} data-testid="about-title">
            Raw footage in, <em className="serif-accent">stories</em> out.
          </motion.h2>
          <motion.p className="about-bio" variants={fadeUp} data-testid="about-bio">
            I turn raw footage into engaging visual stories — clean edits,
            smooth transitions and strong pacing that keep viewers hooked. From
            reels and social clips to long-form YouTube and promos, every edit
            blends creativity with purpose. Every frame counts.
          </motion.p>

          <motion.ul className="why-list" variants={fadeUp} data-testid="why-list">
            {WHY.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={17} aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </motion.ul>

          <motion.p className="about-nudge" variants={fadeUp}>
            Got footage waiting?{" "}
            <a
              href="#contact"
              className="u-draw"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#contact")?.scrollIntoView();
              }}
              data-testid="about-nudge-link"
            >
              Send it over
            </a>
            .
          </motion.p>

          {/* Stats block — fill in only with real numbers, then uncomment:
              Projects delivered: ... · Channels served: ... · Years editing: ... */}
        </motion.div>
      </div>

      <div className="container-x toolkit" aria-label="Editing tools I use">
        <span className="eyebrow">Toolkit</span>
        <ul data-testid="toolkit-list">
          <li>VN Editor</li>
          <li>CapCut</li>
          <li>Canva</li>
        </ul>
      </div>
    </section>
  );
}
