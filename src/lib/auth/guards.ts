import { auth } from "@/auth";

export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}

/** Throws 401 if there is no logged-in session. Returns the session otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError("Sign in required.");
  return session;
}

/** Throws 401/403 unless the current user has the ADMIN role. */
export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required.");
  }
  return session;
}
