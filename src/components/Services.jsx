import { motion } from "framer-motion";
import {
  Smartphone,
  Clapperboard,
  Film,
  Mic,
  Megaphone,
  Palette,
} from "lucide-react";
import { SERVICES } from "@/lib/data";
import { fadeUp, viewportOnce } from "@/lib/motion";

const ICONS = {
  smartphone: Smartphone,
  play: Clapperboard,
  film: Film,
  mic: Mic,
  megaphone: Megaphone,
  palette: Palette,
};

export default function Services() {
  return (
    <section className="services" id="services" aria-labelledby="services-title">
      <div className="container-x">
        <motion.div
          className="section-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">Services</p>
          <h2 id="services-title" data-testid="services-title">
            What I <em className="serif-accent">edit</em>
          </h2>
        </motion.div>

        <div className="services-grid" data-testid="services-grid">
          {SERVICES.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <motion.article
                className="service-card"
                key={s.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                data-testid={`service-card-${i + 1}`}
              >
                <span className="service-num font-display" aria-hidden="true">
                  0{i + 1}
                </span>
                <Icon className="service-icon" size={24} aria-hidden="true" />
                <h3 className="font-display">{s.title}</h3>
                <p>{s.desc}</p>
                <span className="service-ideal">Ideal for: {s.ideal}</span>
                <span className="service-underline" aria-hidden="true" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
