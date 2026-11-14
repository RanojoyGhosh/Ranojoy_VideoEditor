import { useState } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { fadeUp, viewportOnce } from "@/lib/motion";
import { WA_NUMBER, waLink, GOOGLE_SCRIPT_URL } from "@/lib/data";

const SERVICES = [
  "Instagram Reels",
  "YouTube Shorts",
  "YouTube Videos (Long-form)",
  "Podcast Clips",
  "Promotional Videos",
  "Color Grading",
  "Other",
];

const BUDGETS = [
  "Under ₹2,000",
  "₹2,000–₹5,000",
  "₹5,000–₹10,000",
  "₹10,000+",
  "Not sure yet",
];

const CARDS = [
  { icon: MessageCircle, name: "WhatsApp", handle: "+91 93822 90197", url: waLink(), color: "var(--whatsapp)" },
  { icon: Mail, name: "Email", handle: "ranojoyghosh9999@gmail.com", url: "mailto:ranojoyghosh9999@gmail.com" },
  { icon: Instagram, name: "Instagram", handle: "@ranojoyghosh_", url: "https://www.instagram.com/ranojoyghosh_" },
  { icon: Facebook, name: "Facebook", handle: "@RanojoyGhoshh", url: "https://www.facebook.com/RanojoyGhoshh/" },
  { icon: Youtube, name: "YouTube", handle: "@Ranojoy-Ghosh", url: "https://www.youtube.com/@Ranojoy-Ghosh" },
];

const initial = {
  name: "",
  phone: "",
  email: "",
  service: "",
  budget: "",
  deadline: "",
  details: "",
  company: "", // honeypot
};

export default function Contact() {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!v.name.trim()) e.name = "Please tell me your name.";
    if (v.phone.replace(/\D/g, "").length < 10)
      e.phone = "Enter a valid WhatsApp number (at least 10 digits).";
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
      e.email = "That email doesn't look right.";
    if (!v.service) e.service = "Pick the service you need.";
    if (v.details.trim().length < 15)
      e.details = "A few more details help — at least 15 characters.";
    return e;
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    if (v.company) {
      setStatus("sent");
      return;
    }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    setStatus("opening");
    const fields = {
      name: v.name.trim(),
      phone: v.phone.trim(),
      email: v.email.trim() || "-",
      service: v.service,
      budget: v.budget || "",
      deadline: v.deadline || "",
      details: v.details.trim(),
    };
    const msg = [
      "Hi Ranojoy! New project enquiry from your portfolio:",
      "",
      `*Name:* ${fields.name}`,
      `*Phone:* ${fields.phone}`,
      `*Email:* ${fields.email}`,
      `*Service:* ${fields.service}`,
      `*Budget:* ${fields.budget || "Not specified"}`,
      `*Deadline:* ${fields.deadline || "Flexible"}`,
      "",
      "*Project details:*",
      fields.details,
    ].join("\n");
    // Silent backup: Google Sheet + email copy (fire-and-forget, never blocks WhatsApp)
    if (GOOGLE_SCRIPT_URL) {
      try {
        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          body: new URLSearchParams(fields),
        }).catch(() => {});
      } catch (err) {
        /* backup must never block the enquiry */
      }
    }
    setTimeout(() => {
      window.open(
        `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`,
        "_blank",
        "noopener,noreferrer"
      );
      setStatus("sent");
    }, 650);
  };

  const errProps = (key) => ({
    "aria-invalid": errors[key] ? "true" : "false",
    "aria-describedby": errors[key] ? `err-${key}` : undefined,
  });

  const Err = ({ k }) =>
    errors[k] ? (
      <p className="err" id={`err-${k}`} role="alert" data-testid={`contact-error-${k}`}>
        {errors[k]}
      </p>
    ) : null;

  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="container-x">
        <motion.div
          className="section-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <p className="eyebrow">Get in touch</p>
          <h2 id="contact-title" data-testid="contact-title">
            Got footage? Let&apos;s make it <em className="serif-accent">unskippable</em>.
          </h2>
        </motion.div>

        <div className="contact-grid">
          <motion.form
            className="contact-form"
            onSubmit={onSubmit}
            noValidate
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            data-testid="contact-form"
          >
            <div className="form-grid">
              <div className="field">
                <label htmlFor="cf-name">Name *</label>
                <input
                  id="cf-name"
                  className="field-input"
                  type="text"
                  value={v.name}
                  onChange={set("name")}
                  placeholder="Your name"
                  data-testid="contact-name"
                  {...errProps("name")}
                />
                <Err k="name" />
              </div>

              <div className="field">
                <label htmlFor="cf-phone">WhatsApp / Phone *</label>
                <input
                  id="cf-phone"
                  className="field-input"
                  type="tel"
                  value={v.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  data-testid="contact-phone"
                  {...errProps("phone")}
                />
                <Err k="phone" />
              </div>

              <div className="field">
                <label htmlFor="cf-email">Email (optional)</label>
                <input
                  id="cf-email"
                  className="field-input"
                  type="email"
                  value={v.email}
                  onChange={set("email")}
                  placeholder="you@email.com"
                  data-testid="contact-email"
                  {...errProps("email")}
                />
                <Err k="email" />
              </div>

              <div className="field">
                <label htmlFor="cf-service">Service needed *</label>
                <select
                  id="cf-service"
                  className="field-input"
                  value={v.service}
                  onChange={set("service")}
                  data-testid="contact-service"
                  {...errProps("service")}
                >
                  <option value="">Select a service</option>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Err k="service" />
              </div>

              <div className="field">
                <label htmlFor="cf-budget">Budget range (optional)</label>
                <select
                  id="cf-budget"
                  className="field-input"
                  value={v.budget}
                  onChange={set("budget")}
                  data-testid="contact-budget"
                >
                  <option value="">Not specified</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="cf-deadline">Deadline (optional)</label>
                <input
                  id="cf-deadline"
                  className="field-input"
                  type="date"
                  value={v.deadline}
                  onChange={set("deadline")}
                  data-testid="contact-deadline"
                />
              </div>

              <div className="field field-full">
                <label htmlFor="cf-details">Project details *</label>
                <textarea
                  id="cf-details"
                  className="field-input"
                  rows={5}
                  value={v.details}
                  onChange={set("details")}
                  placeholder="What are we making? Share footage type, platform, references…"
                  data-testid="contact-details"
                  {...errProps("details")}
                />
                <Err k="details" />
              </div>

              {/* Honeypot — hidden from humans, catches bots */}
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="cf-company">Company</label>
                <input
                  id="cf-company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={v.company}
                  onChange={set("company")}
                />
              </div>
            </div>

            <div className="contact-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={status === "opening"}
                data-testid="contact-submit"
              >
                {status === "opening" ? (
                  "Opening WhatsApp…"
                ) : (
                  <span className="roll">
                    <span>Send via WhatsApp</span>
                    <span>Send via WhatsApp</span>
                  </span>
                )}
                <MessageCircle size={17} aria-hidden="true" />
              </button>
              {status === "sent" && (
                <p className="form-success" role="status" data-testid="contact-success">
                  <Check size={16} aria-hidden="true" /> Your message is ready in
                  WhatsApp — just hit send ✓
                </p>
              )}
            </div>
          </motion.form>

          <motion.aside
            className="contact-side"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {CARDS.map((c) => (
              <a
                className="c-card"
                key={c.name}
                href={c.url}
                target={c.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                data-testid={`contact-card-${c.name.toLowerCase()}`}
              >
                <span className="c-icon" style={c.color ? { color: c.color } : undefined}>
                  <c.icon size={19} aria-hidden="true" />
                </span>
                <span className="c-body">
                  <span className="c-name">{c.name}</span>
                  <span className="c-handle">{c.handle}</span>
                </span>
                <ArrowUpRight className="c-arrow" size={17} aria-hidden="true" />
              </a>
            ))}

            <div className="contact-photo-row">
              <span className="contact-photo">
                <img
                  src={`${process.env.PUBLIC_URL}/assets/images/profile.webp`}
                  alt="Ranojoy Ghosh"
                  loading="lazy"
                  width="56"
                  height="56"
                />
              </span>
              {/* CONFIRM: reply-time claim below */}
              <p className="reply-note">
                Usually replies <strong>within a few hours</strong>
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
