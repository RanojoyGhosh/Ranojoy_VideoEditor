import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { FAQS } from "@/lib/data";
import { fadeUp, viewportOnce, EASE } from "@/lib/motion";

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="container-x">
        <motion.div
          className="section-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">Questions</p>
          <h2 id="faq-title" data-testid="faq-title">
            Before you <em className="serif-accent">ask</em>
          </h2>
        </motion.div>

        <div className="faq-list" data-testid="faq-list">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <motion.div
                className={`faq-item ${open ? "open" : ""}`}
                key={f.q}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
              >
                <button
                  className="faq-q"
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-button-${i}`}
                  data-testid={`faq-question-${i + 1}`}
                >
                  <span>{f.q}</span>
                  <Plus className="faq-icon" size={18} aria-hidden="true" />
                </button>
                <motion.div
                  className="faq-a-wrap"
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  initial={false}
                  animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <p className="faq-a" dangerouslySetInnerHTML={{ __html: f.a }} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
