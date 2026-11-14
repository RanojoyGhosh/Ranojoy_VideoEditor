export default function Testimonials() {
  const enabled = false; // data-enabled="false"

  if (!enabled) {
    return (
      <>
        {/*
          TESTIMONIALS — intentionally hidden.
          To enable later:
          1. Collect real quotes from real clients (never invent any).
          2. Add a TESTIMONIALS array in src/lib/data.js.
          3. Build the section markup here and set enabled = true above.
        */}
      </>
    );
  }

  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="container-x">
        <h2 id="testimonials-title" className="font-display">
          Kind words
        </h2>
        <div className="testimonials-grid">
          {/* Map real testimonials from src/lib/data.js here */}
        </div>
      </div>
    </section>
  );
}
