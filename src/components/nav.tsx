"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import { signOutAction } from "@/server-actions/session";

const HIDE_ON = ["/", "/signup", "/signin", "/reset-password", "/verify-email", "/invite"];

const LINKS = [
  { href: "/today", label: "Today" },
  { href: "/templates", label: "Templates" },
  { href: "/dashboard", label: "Groups" },
  { href: "/me", label: "History" },
];

export function Nav({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!session?.user) return null;
  if (HIDE_ON.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)))) {
    return null;
  }

  return (
    <header className="border-b border-[var(--color-rule)] backdrop-blur-sm">
      <div
        className="max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between"
        style={{ height: "68px" }}
      >
        {/* Brand — small caps wordmark with hairline ornament */}
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 select-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span
            className="block"
            style={{
              fontSize: "11px",
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "var(--color-clay)",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            est. 26
          </span>
          <span
            style={{
              fontSize: "22px",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 14, "SOFT" 30',
              letterSpacing: "-0.01em",
              color: "var(--color-ink)",
            }}
          >
            Whetstone
          </span>
        </Link>

        {/* Nav links — small caps, hairline separators */}
        <ul className="hidden md:flex items-center gap-1 ml-auto mr-8">
          {LINKS.map((l, idx) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <li key={l.href} className="flex items-center">
                {idx > 0 && (
                  <span
                    aria-hidden
                    className="mx-1 select-none"
                    style={{ color: "var(--color-rule-strong)", fontSize: "10px" }}
                  >
                    ·
                  </span>
                )}
                <Link
                  href={l.href as never}
                  className="relative px-3 py-2 transition-colors"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "11px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--color-ink)" : "var(--color-ink-soft)",
                  }}
                >
                  {l.label}
                  {active && (
                    <span
                      className="absolute left-2 right-2"
                      style={{
                        bottom: "-22px",
                        height: "2px",
                        background: "var(--color-clay)",
                      }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--color-paper-deep)]"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "var(--color-ink)",
              border: "1px solid var(--color-rule)",
              borderRadius: "2px",
            }}
          >
            <span
              aria-hidden
              className="inline-flex items-center justify-center rounded-full"
              style={{
                width: "22px",
                height: "22px",
                background: "var(--color-clay)",
                color: "var(--color-paper)",
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {(session.user.name ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline">{session.user.name}</span>
            <span aria-hidden style={{ fontSize: "9px", color: "var(--color-ink-faint)" }}>▾</span>
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-52 z-50"
              style={{
                background: "var(--color-paper)",
                border: "1px solid var(--color-rule-strong)",
                boxShadow: "0 8px 24px -8px rgba(31, 24, 16, 0.18)",
              }}
            >
              <div
                className="px-3 py-2 border-b"
                style={{
                  borderColor: "var(--color-rule)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "10.5px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--color-ink-faint)",
                }}
              >
                Signed in as
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "14px",
                    letterSpacing: "0",
                    textTransform: "none",
                    color: "var(--color-ink)",
                    fontWeight: 500,
                    marginTop: "2px",
                  }}
                >
                  {session.user.name}
                </div>
              </div>
              <Link
                href="/me/settings"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 transition-colors hover:bg-[var(--color-paper-deep)]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  color: "var(--color-ink)",
                }}
              >
                Preferences
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="block w-full text-left px-3 py-2.5 transition-colors hover:bg-[var(--color-paper-deep)]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    color: "var(--color-clay)",
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
