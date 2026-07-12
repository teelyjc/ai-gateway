import { NextResponse } from "next/server";
import {
  aggregateSpend,
  countActiveVirtualKeys,
  fetchSpendLogs,
  fetchSpendMetrics,
  getTotalKeysSpend,
} from "@/lib/litellm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestedScope = new URL(request.url).searchParams.get("scope");
  const scope = user.role === "admin" && requestedScope !== "mine" ? "all" : "mine";
  const userId = scope === "mine" ? user.id : undefined;

  try {
    const [days, metrics, activeKeys, total_spend] = await Promise.all([
      fetchSpendLogs(userId),
      fetchSpendMetrics(userId),
      countActiveVirtualKeys(userId),
      getTotalKeysSpend(userId),
    ]);
    const usage = aggregateSpend(days);
    return NextResponse.json({
      total_spend,
      active_keys: activeKeys,
      total_tokens: metrics.total_tokens,
      total_requests: metrics.total_requests,
      spend_series: usage.by_day,
      top_models: usage.by_model.slice(0, 5),
      scope,
      can_view_all: user.role === "admin",
    });
  } catch {
    return NextResponse.json({ error: "Unable to load dashboard statistics" }, { status: 502 });
  }
}
