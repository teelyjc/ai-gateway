import { Nav } from "./nav";
import { signOut } from "@/auth";
import type { CurrentUser } from "@/lib/auth";
import { UserMenu } from "./user-menu";

export function Sidebar({ user }: { user: CurrentUser }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="h-6 w-6 rounded-lg bg-accent" />
        <span className="text-sm font-semibold tracking-tight">AI Portal</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <Nav role={user.role} />
      </nav>
      <div className="border-t border-border p-3">
        <UserMenu
          user={user}
          onSignOut={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
      </div>
    </aside>
  );
}
