import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/lib/data";
import { fadeUp, viewportOnce } from "@/lib/motion";
import { prefersReducedMotion, scrollToTarget } from "@/lib/lenis";
import Lightbox from "./Lightbox";

export default function Work() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const track = trackRef.current;
      const section = sectionRef.current;
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${dist() + window.innerHeight * 0.35}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      return () => {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
        gsap.set(track, { clearProps: "transform" });
      };
    });
    return () => mm.revert();
  }, []);

  useEffect(() => {
    const vids = trackRef.current.querySelectorAll("video");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          const v = en.target;
          if (en.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }),
      { threshold: 0.4 }
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  const openProject = PROJECTS.find((p) => p.id === openId) || null;

  return (
    <section className="work" id="work" ref={sectionRef} aria-labelledby="work-title">
      <div className="container-x work-inner">
        <motion.div
          className="section-head work-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">The proof</p>
          <h2 id="work-title" data-testid="work-title">
            Selected <em className="serif-accent">Work</em>
          </h2>
          <p className="work-lede">
            Real cuts, playing live — open one for the full story.
          </p>
        </motion.div>

        <div className="work-viewport" data-cursor="drag">
          <div className="work-track" ref={trackRef} data-testid="work-track">
            {PROJECTS.map((p) => (
              <motion.article
                className="work-card"
                key={p.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
              >
                <button
                  className="phone-card"
                  data-cursor={p.preview ? "play" : "link"}
                  data-testid={`work-card-${p.num}`}
                  onClick={() => setOpenId(p.id)}
                  aria-label={`${p.title} — open project details`}
                >
                  <img src={p.poster} alt="" loading="lazy" width="720" height="1280" />
                  {p.preview && (
                    <video
                      src={p.preview}
                      poster={p.poster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  )}
                  <span className="card-num font-display" aria-hidden="true">
                    {p.num}
                  </span>
                </button>
                <div className="card-meta">
                  <span className="card-tag">{p.category}</span>
                  <h3 className="font-display">{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </motion.article>
            ))}

            <motion.div
              className="work-more-card"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <div>
                <h3 className="font-display">Your video could be next.</h3>
                <p>More work available on request.</p>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => scrollToTarget("#contact")}
                data-testid="work-more-request"
              >
                Ask for it <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <Lightbox project={openProject} onClose={() => setOpenId(null)} />
    </section>
  );
}
