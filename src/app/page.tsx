import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Top masthead — like a newspaper folio */}
      <div
        className="border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "var(--color-ink-faint)",
              fontWeight: 600,
            }}
          >
            Vol. 1 · No. 1
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "12px",
              color: "var(--color-ink-soft)",
            }}
          >
            for the people who keep you sharp
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "var(--color-ink-faint)",
              fontWeight: 600,
            }}
          >
            Daily Edition
          </span>
        </div>
      </div>

      {/* Hero — asymmetric editorial */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-12 grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-7">
          <span className="eyebrow eyebrow-clay">A Quiet Daily Practice</span>
          <h1
            className="mt-6 display"
            style={{
              fontSize: "clamp(56px, 12vw, 132px)",
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            Whet
            <span
              style={{
                fontStyle: "italic",
                fontWeight: 300,
                color: "var(--color-clay)",
                fontVariationSettings: '"opsz" 144, "SOFT" 100',
              }}
            >
              stone
            </span>
            <span style={{ color: "var(--color-clay)", marginLeft: "0.1em" }}>.</span>
          </h1>
          <p
            className="mt-8 max-w-md"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "21px",
              lineHeight: 1.45,
              color: "var(--color-ink-soft)",
              fontWeight: 300,
              fontVariationSettings: '"opsz" 24, "SOFT" 80',
            }}
          >
            Iron sharpens iron — and a daily check-in,
            quietly shared with two or three trusted friends,
            sharpens both the day ahead and the soul that meets it.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-clay">Begin a practice</Link>
            <Link
              href="/signin"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--color-ink-soft)",
                borderBottom: "1px solid var(--color-rule-strong)",
                paddingBottom: "2px",
              }}
            >
              Already keeping one? Sign in
            </Link>
          </div>
        </div>

        {/* Side column — scripture pullquote, magazine-style */}
        <aside className="md:col-span-5 md:pt-10 md:pl-6 md:border-l" style={{ borderColor: "var(--color-rule)" }}>
          <div className="rule-ornament" style={{ margin: "0 0 1.25rem", textAlign: "left" }}>
            <span style={{ color: "var(--color-clay)" }}>✦</span>
          </div>
          <blockquote
            className="scripture"
            style={{
              fontSize: "20px",
              lineHeight: 1.55,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 400,
              fontVariationSettings: '"opsz" 24, "SOFT" 100',
              color: "var(--color-ink)",
              textIndent: "-0.4em",
              paddingLeft: "0.4em",
            }}
          >
            “Iron sharpeneth iron;
            so a man sharpeneth the countenance of his friend.”
          </blockquote>
          <cite
            style={{
              display: "block",
              marginTop: "0.6rem",
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--color-ink-faint)",
              fontStyle: "normal",
            }}
          >
            Proverbs 27:17
          </cite>
        </aside>
      </section>

      {/* Three-column "what it is" — editorial brief */}
      <section
        className="max-w-6xl mx-auto px-6 md:px-10 pt-12 pb-20 mt-8 grid md:grid-cols-3 gap-10 md:gap-14 border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <Brief
          num="I"
          title="Your own template"
          body="Three lines, ten lines, whatever you need. Write your own daily questions — keep them, edit them, share them with the group."
        />
        <Brief
          num="II"
          title="A shared room"
          body="Two or three friends in a quiet room. Each posts daily. You see each other — read, react, encourage. No likes. No follows. No noise."
        />
        <Brief
          num="III"
          title="A nudge, not a notification"
          body="One Discord ping at the time you choose, only if you haven't checked in. If you have, silence. The day is yours."
        />
      </section>

      {/* Footer colophon */}
      <footer
        className="border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex items-center justify-between">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "13px",
              color: "var(--color-ink-faint)",
            }}
          >
            Set in Fraunces & Public Sans · printed on cream
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "10px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--color-ink-faint)",
              fontWeight: 600,
            }}
          >
            Whetstone — Anno mmxxvi
          </span>
        </div>
      </footer>
    </main>
  );
}

function Brief({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <article className="relative">
      <div
        aria-hidden
        className="absolute -top-1 -left-2"
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: "44px",
          color: "var(--color-clay-soft)",
          opacity: 0.5,
          fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1',
          lineHeight: 1,
        }}
      >
        {num}.
      </div>
      <div className="pl-10">
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "20px",
            color: "var(--color-ink)",
            marginBottom: "8px",
            fontVariationSettings: '"opsz" 24, "SOFT" 30',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            lineHeight: 1.55,
            color: "var(--color-ink-soft)",
            fontWeight: 400,
            fontVariationSettings: '"opsz" 14',
          }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}
