import { NextResponse } from "next/server";
import { fetchSpendLogs, fetchModelPricing } from "@/lib/litellm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requestedScope = new URL(request.url).searchParams.get("scope");
  const scope = user.role === "admin" && requestedScope !== "mine" ? "all" : "mine";

  try {
    const [days, pricing] = await Promise.all([
      fetchSpendLogs(scope === "mine" ? user.id : undefined),
      fetchModelPricing().catch(() => undefined),
    ]);
    const rows = days.map((d) => {
      const p = pricing?.[d.model] ?? pricing?.[d.model.replace(/\//g, "-")];
      const est =
        p && (d.prompt_tokens || d.completion_tokens)
          ? Number(
              ((d.prompt_tokens / 1_000_000) * p.input +
                (d.completion_tokens / 1_000_000) * p.output).toFixed(6)
            )
          : 0;
      const est_cost = d.spend > 0 ? d.spend : est;
      return { ...d, est_cost };
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Unable to load usage logs" }, { status: 502 });
  }
}
