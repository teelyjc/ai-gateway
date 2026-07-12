import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  subject: string;
  name: string;
  email: string | null;
  role: "admin" | "user";
  groups: string[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.username || session.user.id,
    subject: session.user.id,
    name: session.user.name ?? session.user.username,
    email: session.user.email ?? null,
    role: session.user.role,
    groups: session.user.groups,
  };
}
