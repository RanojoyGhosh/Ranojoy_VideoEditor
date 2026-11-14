import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { waLink } from "@/lib/data";

function WhatsAppGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2.1 22l4.94-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.1 15.1l-.3-.18-2.94.9.9-2.87-.2-.31a8.1 8.1 0 0 1 6.64-12.64Zm-3.1 3.7c-.18 0-.46.06-.7.32-.24.26-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.18 1.8 2.87 4.45 3.9 2.2.87 2.65.7 3.13.65.48-.04 1.55-.63 1.77-1.24.22-.6.22-1.13.15-1.24-.06-.11-.24-.18-.5-.31-.26-.13-1.55-.77-1.79-.85-.24-.09-.41-.13-.59.13-.17.26-.67.85-.82 1.03-.15.17-.3.2-.56.06-.26-.13-1.1-.4-2.1-1.3-.77-.7-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.3.4-.46.12-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.42-.82-1.95-.2-.47-.4-.48-.56-.49h-.55Z" />
    </svg>
  );
}

export default function WhatsAppFloat() {
  const [past, setPast] = useState(false);
  const [contactNear, setContactNear] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const contact = document.getElementById("contact");
    let obs;
    if (contact) {
      obs = new IntersectionObserver(
        (entries) => entries.forEach((en) => setContactNear(en.isIntersecting)),
        { threshold: 0.1 }
      );
      obs.observe(contact);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (obs) obs.disconnect();
    };
  }, []);

  const show = past && !contactNear;

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          className="wa-float"
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          initial={{ opacity: 0, scale: 0.4, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          data-testid="whatsapp-float"
        >
          <WhatsAppGlyph />
          <span className="wa-tip" role="tooltip">
            Chat on WhatsApp
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
