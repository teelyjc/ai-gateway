"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchUsage, fetchSpendLogs } from "@/lib/api";
import { StatsScope, UsageSummary, SpendLog } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { SpendChart } from "@/components/usage/spend-chart";
import { TokensChart } from "@/components/usage/tokens-chart";
import { ModelDonut, KeyBars } from "@/components/usage/breakdown-charts";
import { BreakdownTable, BreakdownRow } from "@/components/usage/breakdown-table";
import { FilterBar } from "@/components/usage/filter-bar";
import { Tabs } from "@/components/ui/tabs";

const RANGE_OPTIONS = ["7d", "30d", "all"];

function maskKey(key: string): string {
  if (!key || key.length < 8) return key || "—";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

function inRange(date: string, days: number): boolean {
  if (days === Infinity) return true;
  const d = new Date(date);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<SpendLog[]>([]);
  const [range, setRange] = useState("30d");
  const [model, setModel] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(scope?: StatsScope) {
    setLoading(true);
    setError("");
    try {
      const [summary, rawLogs] = await Promise.all([
        fetchUsage(scope),
        fetchSpendLogs(scope),
      ]);
      setUsage(summary);
      setLogs(rawLogs);
      setModel("all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rangeDays = useMemo(
    () => (range === "all" ? Infinity : range === "7d" ? 7 : 30),
    [range]
  );

  const modelOptions = useMemo(
    () => usage?.by_model.map((m) => m.model) ?? [],
    [usage]
  );

  const byDay = useMemo(() => {
    if (!usage) return [];
    const sorted = [...usage.by_day].sort((a, b) => a.date.localeCompare(b.date));
    return rangeDays === Infinity ? sorted : sorted.slice(-rangeDays);
  }, [usage, rangeDays]);

  const byModel = useMemo(() => {
    if (!usage) return [];
    return model === "all"
      ? usage.by_model
      : usage.by_model.filter((m) => m.model === model);
  }, [usage, model]);

  const modelRows: BreakdownRow[] = useMemo(
    () => usage?.by_model.map((m) => ({ label: m.model, cost: m.est_cost, tokens: m.tokens })) ?? [],
    [usage]
  );

  const keyRows: BreakdownRow[] = useMemo(
    () => usage?.by_key.map((k) => ({ label: k.key, cost: k.est_cost, tokens: k.tokens })) ?? [],
    [usage]
  );

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => inRange(l.startTime, rangeDays))
      .filter((l) => model === "all" || l.model === model)
      .slice()
      .sort((a, b) => (a.startTime < b.startTime ? 1 : -1));
  }, [logs, rangeDays, model]);

  const totalCost = useMemo(
    () => byDay.reduce((s, d) => s + d.est_cost, 0),
    [byDay]
  );
  const totalTokens = useMemo(
    () => byDay.reduce((s, d) => s + d.tokens, 0),
    [byDay]
  );
  const requests = filteredLogs.length;
  const avgCostPerRequest = requests ? totalCost / requests : 0;
  const costPerM = totalTokens ? (totalCost / totalTokens) * 1_000_000 : 0;

  if (!usage && loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!usage) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Usage analysis</h1>
          <p className="text-sm text-muted-foreground">
            {usage.scope === "all"
              ? "Detailed usage across all users"
              : "Your detailed usage"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {usage.can_view_all && (
            <Tabs
              tabs={[{ value: "all", label: "All users" }, { value: "mine", label: "My usage" }]}
              active={usage.scope}
              onChange={(value) => load(value as StatsScope)}
            />
          )}
          <FilterBar
            range={range}
            model={model}
            rangeOptions={RANGE_OPTIONS}
            modelOptions={modelOptions}
            onRange={setRange}
            onModel={setModel}
          />
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Cost"
          value={`$${totalCost.toFixed(4)}`}
          hint={`last ${range}`}
        />
        <StatCard
          label="Tokens"
          value={totalTokens.toLocaleString()}
          hint={`last ${range}`}
        />
        <StatCard label="Requests" value={requests.toLocaleString()} hint="in view" />
        <StatCard
          label="Avg cost / request"
          value={`$${avgCostPerRequest.toFixed(4)}`}
          hint={`$${costPerM.toFixed(2)} / 1M tokens`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost over time</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendChart data={byDay} dataKey="est_cost" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tokens over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TokensChart data={byDay} />
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Cost uses LiteLLM&apos;s recorded spend for paid requests and falls back
        to a token×pricing estimate for requests LiteLLM bills as $0 (e.g. free
        models). The two trends above rarely move in lockstep: a rising token
        line with a flat cost line means cheaper models are carrying more
        traffic, while a cost spike on a stable token line points to an expensive
        model being used.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-60 w-full">
            <ModelDonut data={byModel} dataKey="est_cost" />
          </div>
          <BreakdownTable rows={modelRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-60 w-full">
            <KeyBars data={usage.by_key} dataKey="est_cost" />
          </div>
          <BreakdownTable rows={keyRows} formatLabel={maskKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Recent requests
            {model !== "all" && (
              <span className="ml-2 font-mono text-xs text-foreground">{model}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No requests in the selected range.
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Time</TH>
                    <TH>Model</TH>
                    <TH>Key</TH>
                    <TH className="text-right">Tokens</TH>
                    <TH className="text-right">Cost</TH>
                  </TR>
                </THead>
                <TBody>
                  {filteredLogs.map((l, i) => (
                    <TR key={i}>
                      <TD className="whitespace-nowrap text-muted-foreground">
                        {l.startTime ? new Date(l.startTime).toLocaleString() : "—"}
                      </TD>
                      <TD className="font-mono text-xs">{l.model}</TD>
                      <TD className="font-mono text-xs text-muted-foreground">
                        {maskKey(l.api_key)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {(l.total_tokens ?? 0).toLocaleString()}
                      </TD>
                      <TD className="text-right tabular-nums">
                        ${((l.est_cost as number) ?? 0).toFixed(4)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
