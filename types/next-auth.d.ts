import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      groups: string[];
      role: "admin" | "user";
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    groups: string[];
    role: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    groups?: string[];
    role?: "admin" | "user";
  }
}
