import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared layout for every auth-flow page (signup, signin, verify, reset).
 * Two-column on desktop: editorial left rail + form on the right.
 * Single column on mobile.
 */
export function AuthShell({
  eyebrow,
  title,
  italic,
  intro,
  scripture,
  scriptureCite,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  intro?: string;
  scripture?: string;
  scriptureCite?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      {/* Folio masthead, mirrors landing */}
      <div className="border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between">
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 14, "SOFT" 30',
              letterSpacing: "-0.01em",
              color: "var(--color-ink)",
            }}
          >
            Whetstone
          </Link>
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
            {eyebrow}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-20 grid md:grid-cols-12 gap-10 md:gap-16">
        {/* Left rail: title + scripture or intro */}
        <aside className="md:col-span-6">
          <h1
            className="display"
            style={{
              fontSize: "clamp(40px, 7vw, 68px)",
              lineHeight: 0.96,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "WONK" 1',
            }}
          >
            {title}
            {italic && (
              <>
                {" "}
                <span
                  style={{
                    fontStyle: "italic",
                    fontWeight: 300,
                    color: "var(--color-clay)",
                    fontVariationSettings: '"opsz" 144, "SOFT" 100',
                  }}
                >
                  {italic}
                </span>
              </>
            )}
            <span style={{ color: "var(--color-clay)" }}>.</span>
          </h1>

          {intro && (
            <p
              className="mt-6 max-w-md"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "18px",
                lineHeight: 1.5,
                color: "var(--color-ink-soft)",
                fontWeight: 400,
                fontVariationSettings: '"opsz" 24, "SOFT" 80',
              }}
            >
              {intro}
            </p>
          )}

          {scripture && (
            <div
              className="mt-10 pl-6 md:pl-8 border-l"
              style={{ borderColor: "var(--color-clay-soft)" }}
            >
              <blockquote
                className="scripture"
                style={{
                  fontSize: "17px",
                  lineHeight: 1.55,
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                }}
              >
                &ldquo;{scripture}&rdquo;
              </blockquote>
              {scriptureCite && (
                <cite
                  style={{
                    display: "block",
                    marginTop: "0.5rem",
                    fontFamily: "var(--font-sans)",
                    fontSize: "10.5px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: "var(--color-ink-faint)",
                    fontStyle: "normal",
                  }}
                >
                  {scriptureCite}
                </cite>
              )}
            </div>
          )}
        </aside>

        {/* Right: form panel — letterpress paper card */}
        <section className="md:col-span-6">
          <div
            className="paper p-7 md:p-10"
            style={{ minHeight: "320px" }}
          >
            {children}
          </div>
          {footer && (
            <div
              className="mt-5"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "14px",
                color: "var(--color-ink-soft)",
                fontStyle: "italic",
              }}
            >
              {footer}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
