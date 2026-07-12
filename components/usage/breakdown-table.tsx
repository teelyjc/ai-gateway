"use client";

import { cn } from "@/lib/cn";

export interface BreakdownRow {
  label: string;
  cost: number;
  tokens: number;
}

const COLORS = ["#111111", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];

export function BreakdownTable({
  rows,
  formatLabel,
}: {
  rows: BreakdownRow[];
  formatLabel?: (label: string) => string;
}) {
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity in the selected range.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 text-right font-medium">Cost</th>
            <th className="px-3 py-2.5 text-right font-medium">% Cost</th>
            <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
            <th className="px-3 py-2.5 text-right font-medium">% Tokens</th>
            <th className="px-3 py-2.5 text-right font-medium">$/1M tok</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const costShare = totalCost ? (r.cost / totalCost) * 100 : 0;
            const tokenShare = totalTokens ? (r.tokens / totalTokens) * 100 : 0;
            const costPerM = r.tokens ? (r.cost / r.tokens) * 1_000_000 : 0;
            return (
              <tr key={r.label} className="border-t border-border">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-mono text-xs">
                      {formatLabel ? formatLabel(r.label) : r.label}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  ${r.cost.toFixed(4)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${costShare}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <span>{costShare.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {r.tokens.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {tokenShare.toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {r.tokens ? `$${costPerM.toFixed(2)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={cn("border-t-2 border-border font-medium")}>
            <td className="px-3 py-3">Total</td>
            <td className="px-3 py-3 text-right tabular-nums">
              ${totalCost.toFixed(4)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">100%</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {totalTokens.toLocaleString()}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">100%</td>
            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
              {totalTokens ? `$${((totalCost / totalTokens) * 1_000_000).toFixed(2)}` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
