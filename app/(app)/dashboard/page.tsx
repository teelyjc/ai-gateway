"use client";

import { useEffect, useState } from "react";
import { fetchDashboard } from "@/lib/api";
import { DashboardStats, StatsScope } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { SpendChart } from "@/components/usage/spend-chart";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(scope?: StatsScope) {
    setLoading(true);
    setError("");
    try {
      setStats(await fetchDashboard(scope));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!stats && loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!stats) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {stats.scope === "all" ? "Statistics for all users" : "Your statistics"}
          </p>
        </div>
        {stats.can_view_all && (
          <Tabs
            tabs={[{ value: "all", label: "All users" }, { value: "mine", label: "My usage" }]}
            active={stats.scope}
            onChange={(value) => load(value as StatsScope)}
          />
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total spend" value={`$${stats.total_spend.toFixed(2)}`} />
        <StatCard label="Active keys" value={String(stats.active_keys)} />
        <StatCard
          label="Tokens"
          value={stats.total_tokens.toLocaleString()}
        />
        <StatCard label="Requests" value={String(stats.total_requests)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spend over time</CardTitle>
        </CardHeader>
        <CardContent>
          <SpendChart data={stats.spend_series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top models by spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {stats.top_models.map((m) => (
              <div
                key={m.model}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono">{m.model}</span>
                <Badge tone="solid">${m.spend.toFixed(2)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
