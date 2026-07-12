"use client";

import { useState } from "react";

export function UserMenu({
  user,
  onSignOut,
}: {
  user: { name: string; id: string };
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{user.id}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted-foreground">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-20 mb-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          >
            <form action={onSignOut}>
              <button
                type="submit"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
