import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config: no Mongoose/bcrypt imports here, so this can be shared
 * with middleware (which runs on the Edge runtime). The Credentials
 * provider and any DB-touching callbacks live in `auth.ts` (Node runtime)
 * and are merged in for the actual API route / server components.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      if (nextUrl.pathname.startsWith("/admin")) {
        return isLoggedIn && role === "ADMIN";
      }
      if (nextUrl.pathname.startsWith("/account")) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // populated in auth.ts
} satisfies NextAuthConfig;

export default authConfig;
