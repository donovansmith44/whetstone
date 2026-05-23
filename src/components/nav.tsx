"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Session } from "next-auth";
import { signOutAction } from "@/server-actions/session";
import { Button } from "@/components/ui/button";

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

  if (!session?.user) return null;
  if (HIDE_ON.some((p) => p === "/" ? pathname === "/" : pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">Whetstone</Link>
          <ul className="flex gap-4 text-sm">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href}>
                  <Link
                    href={l.href as never}
                    className={active ? "font-medium text-gray-900 border-b-2 border-gray-900 pb-3.5 -mb-3.5" : "text-gray-600 hover:text-gray-900"}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
            {session.user.name} ▾
          </Button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-md text-sm z-50">
              <Link href="/me/settings" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                Settings
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="block w-full text-left px-3 py-2 hover:bg-gray-50">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
