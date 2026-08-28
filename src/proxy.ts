import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Uses the Edge-safe config only (no Mongoose/bcrypt) so this can run in
// the Edge proxy runtime. Route-level guards in /admin and /account API
// routes still re-check role server-side — this is a UX gate, not the
// security boundary.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
