import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone",
  description: "Daily accountability check-ins with your group.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
