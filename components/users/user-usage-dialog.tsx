"use client";

import { useEffect, useState } from "react";
import { fetchUserUsage } from "@/lib/api";
import { UserUsage } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { SpendChart } from "@/components/usage/spend-chart";

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function UserUsageDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");
    setUsage(null);
    fetchUserUsage(userId)
      .then(setUsage)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load usage"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Dialog open={userId != null} onClose={onClose} title="Customer usage">
      <div className="space-y-4">
        <p className="break-all font-mono text-xs text-muted-foreground">{userId}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading usage…</p>
        ) : usage ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Spend</div>
                <div className="text-lg font-semibold tabular-nums">
                  ${usage.total_spend.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Requests</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatNumber(usage.total_requests)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="text-xs text-muted-foreground">Tokens</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatNumber(usage.total_tokens)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Spend over time
              </div>
              <SpendChart
                data={[...usage.spend_series].sort((a, b) => a.date.localeCompare(b.date))}
              />
            </div>

            {usage.top_models.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Top models by spend
                </div>
                <ul className="space-y-1">
                  {usage.top_models.map((m) => (
                    <li
                      key={m.model}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate font-mono text-xs">{m.model}</span>
                      <span className="tabular-nums text-muted-foreground">
                        ${m.spend.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
