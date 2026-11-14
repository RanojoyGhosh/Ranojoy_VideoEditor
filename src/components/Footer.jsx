import { ArrowUp } from "lucide-react";
import { scrollToTarget } from "@/lib/lenis";
import { SOCIALS } from "@/lib/data";

const LINKS = ["work", "services", "about", "process", "contact"];

export default function Footer() {
  return (
    <footer className="footer" aria-label="Footer">
      <div className="container-x">
        <p className="wordmark font-display" aria-hidden="true" data-testid="footer-wordmark">
          Ranojoy Ghosh
        </p>

        <div className="footer-grid">
          <nav className="footer-links" aria-label="Footer navigation">
            {LINKS.map((l) => (
              <a
                key={l}
                href={`#${l}`}
                className="u-draw"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget(`#${l}`);
                }}
                data-testid={`footer-link-${l}`}
              >
                {l === "work" ? "Work" : l[0].toUpperCase() + l.slice(1)}
              </a>
            ))}
          </nav>

          <div className="footer-socials">
            {SOCIALS.filter((s) => s.name !== "WhatsApp").map((s) => (
              <a
                key={s.name}
                href={s.url}
                target={s.url.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="u-draw"
                data-testid={`footer-social-${s.name.toLowerCase()}`}
              >
                {s.name}
              </a>
            ))}
          </div>

          <button
            className="to-top"
            onClick={() => scrollToTarget("#top")}
            aria-label="Back to top"
            data-testid="back-to-top"
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="footer-bottom">© 2026 Ranojoy Ghosh · Video Editor</p>
      </div>
    </footer>
  );
}
