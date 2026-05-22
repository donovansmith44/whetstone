import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;
  const needsAuth =
    path.startsWith("/dashboard") || path.startsWith("/today");
  if (needsAuth && !isAuthed) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/today/:path*"],
};
