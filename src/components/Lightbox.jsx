import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import { lockScroll } from "@/lib/lenis";
import { waLink } from "@/lib/data";
import { EASE } from "@/lib/motion";

export default function Lightbox({ project, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!project) return;
    lockScroll(true);
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      document.removeEventListener("keydown", onKey);
    };
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="lb-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
          data-testid="lightbox-backdrop"
        >
          <motion.div
            className="lb-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} — project details`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 64, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EASE }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            dragMomentum={false}
            onDragEnd={(e, info) => info.offset.y > 90 && onClose()}
            data-testid="lightbox-panel"
          >
            <button
              ref={closeRef}
              className="lb-close"
              onClick={onClose}
              aria-label="Close project view"
              data-testid="lightbox-close"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="lb-media">
              {project.full ? (
                <video
                  src={project.full}
                  poster={project.poster}
                  controls
                  autoPlay
                  playsInline
                  data-testid="lightbox-video"
                />
              ) : (
                <div className="lb-media-placeholder">
                  <img src={project.poster} alt={`${project.title} — grading still`} />
                  <div className="lb-note">
                    <p>Full video available on request.</p>
                    <a
                      className="btn btn-primary"
                      href={waLink(`Hi Ranojoy! Can you share the full "${project.title}" video?`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="lightbox-whatsapp"
                    >
                      Ask on WhatsApp <MessageCircle size={16} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="lb-info">
              <span className="card-tag">{project.category}</span>
              <h3 className="font-display">
                {project.num} — {project.title}
              </h3>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{project.type}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{project.platform}</dd>
                </div>
                <div>
                  <dt>What I did</dt>
                  <dd>{project.did}</dd>
                </div>
              </dl>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
