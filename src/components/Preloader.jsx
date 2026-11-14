import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "@/lib/motion";
import Logo from "./Logo";

export default function Preloader({ onDone }) {
  const reduce = useReducedMotion();
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem("rg_preloaded") === "1";
    } catch {
      return true;
    }
  });
  const [gone, setGone] = useState(false);
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setGone(true);
    onDone();
  };

  useEffect(() => {
    if (seen || reduce) {
      finish();
      return;
    }
    try {
      sessionStorage.setItem("rg_preloaded", "1");
    } catch {
      /* private mode */
    }
    const start = performance.now();
    const DURATION = 1050;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 180);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {!gone && !seen && (
        <motion.div
          className="preloader"
          data-testid="preloader"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.75, ease: EASE }}
          aria-hidden="true"
        >
          <div className="preloader-inner">
            <Logo size={44} />
            <div className="preloader-count font-display">{count}</div>
            <div className="preloader-label eyebrow">Ranojoy Ghosh — Video Editor</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
