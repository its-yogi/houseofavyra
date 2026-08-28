import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import authConfig from "@/auth.config";
import connectDB from "@/lib/db/connect";
import { User } from "@/lib/db/models";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Multiple providers (Google + Credentials) may legitimately share an
      // email; we resolve them to the same User document by email below.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        await connectDB();
        const user = await User.findOne({ email }).select("+password");

        // No account, or account was created via Google (no password set)
        if (!user || !user.password) return null;

        if (user.isBlocked) {
          throw new Error("This account has been blocked. Contact support.");
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger }) {
      // Initial sign-in: `user`/`account` are only present on this pass.
      if (user && account) {
        await connectDB();

        if (account.provider === "google") {
          const email = user.email!.toLowerCase();
          // Upsert avoids a race where two near-simultaneous Google sign-ins
          // for a brand-new email both try to create the same user.
          const dbUser = await User.findOneAndUpdate(
            { email },
            {
              $setOnInsert: {
                name: user.name ?? email,
                email,
                image: user.image,
                provider: "google",
                role: "USER",
                emailVerified: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          if (dbUser.isBlocked) {
            throw new Error("This account has been blocked. Contact support.");
          }

          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.picture = dbUser.image;
        } else {
          // Credentials provider already validated the user in authorize()
          token.id = user.id as string;
          token.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
        }

        return token;
      }

      // Subsequent requests: refresh role from DB on explicit update, or
      // backfill if an older token is missing it.
      if (trigger === "update" || !token.role) {
        await connectDB();
        const dbUser = await User.findById(token.id).select("role isBlocked image");
        if (dbUser) {
          if (dbUser.isBlocked) throw new Error("This account has been blocked.");
          token.role = dbUser.role;
          token.picture = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
});
