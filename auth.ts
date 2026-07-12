import NextAuth from "next-auth";
import { ensureLiteLLMUser } from "@/lib/litellm";

type AuthentikProfile = {
  sub: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  groups?: unknown;
};

function groupsFromClaim(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((group): group is string => typeof group === "string") : [];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    {
      id: "authentik",
      name: "Authentik",
      type: "oidc",
      issuer: process.env.AUTHENTIK_ISSUER ?? "",
      clientId: process.env.AUTHENTIK_CLIENT_ID ?? "",
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET ?? "",
      checks: ["pkce", "state"],
      authorization: { params: { scope: "openid profile email" } },
      profile(profile: AuthentikProfile) {
        const groups = groupsFromClaim(profile.groups);
        const username = profile.preferred_username ?? profile.email ?? profile.sub;
        const adminGroup = process.env.AUTHENTIK_ADMIN_GROUP ?? "ai-gateway-admins";

        return {
          id: profile.sub,
          name: profile.name ?? username,
          email: profile.email ?? null,
          username,
          groups,
          role: groups.includes(adminGroup) ? "admin" : "user",
        };
      },
    },
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.groups = user.groups;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.username =
        typeof token.username === "string"
          ? token.username
          : typeof token.email === "string"
            ? token.email
            : token.sub ?? "";
      session.user.groups = Array.isArray(token.groups)
        ? token.groups.filter((group): group is string => typeof group === "string")
        : [];
      session.user.role = token.role === "admin" ? "admin" : "user";
      return session;
    },
    authorized({ auth: session }) {
      return Boolean(session?.user);
    },
    async signIn({ user }) {
      // Provision an internal LiteLLM user so spend/keys attribute correctly.
      // Best-effort: a failure must never block authentication.
      try {
        await ensureLiteLLMUser({
          userId: user.username || user.id || "",
          email: user.email,
          role: user.role === "admin" ? "admin" : "user",
        });
      } catch {
        // ignore — login should still succeed
      }
      return true;
    },
  },
});
