import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import { scrollToTarget, getLenis } from "@/lib/lenis";
import { EASE } from "@/lib/motion";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "process", label: "Process" },
  { id: "contact", label: "Contact" },
];

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 80);
      setHidden(y > 140 && y > lastY + 2);
      if (y < 300) setActive("");
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(en.target.id);
        }),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;
    open ? lenis.stop() : lenis.start();
  }, [open]);

  const go = (e, id) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => scrollToTarget(`#${id}`), open ? 60 : 0);
  };

  return (
    <>
      <header
        className={`nav ${solid ? "solid" : ""} ${hidden && !open ? "buried" : ""}`}
        data-testid="site-nav"
      >
        <div className="container-x nav-inner">
          <a href="#top" className="nav-logo" onClick={(e) => go(e, "top")} aria-label="Ranojoy Ghosh — home" data-testid="nav-logo">
            <Logo size={34} withName />
          </a>

          <nav className="nav-links" aria-label="Primary">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={`u-draw nav-link ${active === l.id ? "active" : ""}`}
                onClick={(e) => go(e, l.id)}
                data-testid={`nav-link-${l.id}`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="nav-right">
            <a href="#contact" className="btn btn-primary nav-cta" onClick={(e) => go(e, "contact")} data-testid="nav-lets-talk">
              Let&apos;s Talk
            </a>
            <button
              className={`nav-toggle ${open ? "open" : ""}`}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              data-testid="mobile-menu-toggle"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <nav aria-label="Mobile">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.id}
                  href={`#${l.id}`}
                  className="mobile-link font-display"
                  onClick={(e) => go(e, l.id)}
                  initial={{ y: 42, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 24, opacity: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.55, ease: EASE }}
                  data-testid={`mobile-link-${l.id}`}
                >
                  {l.label}
                </motion.a>
              ))}
            </nav>
            <motion.a
              href="#contact"
              className="btn btn-primary"
              onClick={(e) => go(e, "contact")}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
              data-testid="mobile-lets-talk"
            >
              Let&apos;s Talk
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
