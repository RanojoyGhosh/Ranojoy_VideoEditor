import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { AUDIENCES } from "@/lib/data";
import { fadeUp, viewportOnce } from "@/lib/motion";

export default function Audience() {
  return (
    <section className="audience" aria-labelledby="audience-title">
      <div className="container-x">
        <motion.div
          className="section-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">Who I help</p>
          <h2 id="audience-title" data-testid="audience-title">
            Made for people who need <em className="serif-accent">eyes</em>
          </h2>
        </motion.div>

        <div className="aud-grid" data-testid="audience-grid">
          {AUDIENCES.map((a, i) => (
            <motion.article
              className="aud-card"
              key={a.who}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              data-testid={`audience-card-${i + 1}`}
            >
              <h3 className="font-display">{a.who}</h3>
              <p className="aud-pain">{a.pain}</p>
              <span className="aud-arrow" aria-hidden="true">
                <ArrowDown size={16} />
              </span>
              <p className="aud-result">{a.result}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
