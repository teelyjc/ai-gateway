import { NextResponse } from "next/server";
import { fetchSpendLogs, fetchModelPricing, aggregateSpend } from "@/lib/litellm";
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
    const [days, pricing] = await Promise.all([
      fetchSpendLogs(userId),
      fetchModelPricing().catch(() => undefined),
    ]);
    return NextResponse.json({
      ...aggregateSpend(days, pricing),
      scope,
      can_view_all: user.role === "admin",
    });
  } catch {
    return NextResponse.json({ error: "Unable to load usage statistics" }, { status: 502 });
  }
}
