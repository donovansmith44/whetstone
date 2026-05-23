import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Whetstone — daily check-ins",
  description: "A quiet place for daily accountability with the people who keep you sharp.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body
        style={{
          fontFamily: `var(--font-public-sans), -apple-system, "Segoe UI", system-ui, sans-serif`,
        }}
      >
        <SessionProvider session={session}>
          <Nav session={session} />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
