import { Sidebar } from "./sidebar";
import type { CurrentUser } from "@/lib/auth";

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar user={user} />
      <div className="ml-56 min-h-screen">
        <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
