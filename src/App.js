import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { initSmoothScroll, scrollToTarget } from "@/lib/lenis";
import Preloader from "@/components/Preloader";
import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Work from "@/components/Work";
import About from "@/components/About";
import Services from "@/components/Services";
import Audience from "@/components/Audience";
import Process from "@/components/Process";
import QuoteBand from "@/components/QuoteBand";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initSmoothScroll();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 650);
    return () => clearTimeout(t);
  }, [ready]);

  const onDone = useCallback(() => setReady(true), []);

  return (
    <ErrorBoundary>
      <a
        className="skip-link"
        href="#work"
        onClick={(e) => {
          e.preventDefault();
          scrollToTarget("#work", -100);
        }}
        data-testid="skip-link"
      >
        Skip to content
      </a>
      <div className="grain" aria-hidden="true" />
      <Cursor />
      <Preloader onDone={onDone} />
      <Nav />
      <main id="main">
        <Hero ready={ready} />
        <Marquee />
        <Work />
        <About />
        <Services />
        <Audience />
        <Process />
        <QuoteBand />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
    </ErrorBoundary>
  );
}
