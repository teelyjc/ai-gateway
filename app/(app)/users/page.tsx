"use client";

import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/api";
import { LiteLLMUser, LiteLLMUserList } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { UserUsageDialog } from "@/components/users/user-usage-dialog";

const EMPTY_LIST: LiteLLMUserList = {
  users: [],
  total_count: 0,
  current_page: 1,
  total_pages: 0,
};

function formatSpend(value: number) {
  if (!value) return "$0.00";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function UsersPage() {
  const [list, setList] = useState<LiteLLMUserList>(EMPTY_LIST);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [usageUser, setUsageUser] = useState<string | null>(null);

  function load(nextPage: number) {
    setLoading(true);
    setError("");
    fetchUsers(nextPage)
      .then((users) => setList(users))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load users"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(page);
  }, [page]);

  function sync() {
    setSyncing(true);
    setError("");
    fetchUsers(page)
      .then((users) => setList(users))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to sync users"))
      .finally(() => setSyncing(false));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {list.total_count} LiteLLM {list.total_count === 1 ? "user" : "users"} synced from the proxy.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={sync} disabled={syncing || loading}>
          {syncing ? "Syncing…" : "Sync"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : list.users.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No LiteLLM users found.
          </p>
        ) : (
          <Table className="min-w-[640px]">
            <THead>
              <TR className="border-t-0">
                <TH>User ID</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH className="text-right">Spend</TH>
                <TH>Created</TH>
                <TH className="sticky right-0 z-10 bg-white text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {list.users.map((u) => (
                <TR key={u.user_id} className="hover:bg-zinc-50">
                  <TD>
                    <div className="font-mono text-xs text-foreground">{u.user_id}</div>
                  </TD>
                  <TD>
                    <div className="text-sm text-muted-foreground">{u.user_email ?? "—"}</div>
                  </TD>
                  <TD>
                    <Badge tone={u.user_role === "app_admin" || u.user_role === "proxy_admin" ? "solid" : "outline"}>
                      {u.user_role}
                    </Badge>
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {formatSpend(u.spend)}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </TD>
                  <TD className="sticky right-0 z-10 bg-white text-right">
                    <Button variant="ghost" size="sm" onClick={() => setUsageUser(u.user_id)}>
                      Usage
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {list.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {list.current_page} of {list.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= list.total_pages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <UserUsageDialog userId={usageUser} onClose={() => setUsageUser(null)} />
    </div>
  );
}
