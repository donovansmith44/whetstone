import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/invite/")) return; // handled in-page
  const needsAuth =
    path.startsWith("/dashboard") ||
    path.startsWith("/today") ||
    path.startsWith("/groups") ||
    path.startsWith("/g/") ||
    path.startsWith("/templates") ||
    path.startsWith("/me");
  if (needsAuth && !isAuthed) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/today/:path*", "/groups/:path*", "/g/:path*", "/templates/:path*", "/me/:path*"],
};
