import { Progress } from "@/components/ui/progress";

export function BudgetProgress({
  spend,
  maxBudget,
}: {
  spend: number;
  maxBudget: number | null;
}) {
  const pct = maxBudget && maxBudget > 0 ? (spend / maxBudget) * 100 : 0;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">${spend.toFixed(2)}</span>
        <span className="tabular-nums">
          {maxBudget == null ? "Unlimited" : `$${maxBudget.toFixed(2)}`}
        </span>
      </div>
      {maxBudget != null && <Progress value={pct} />}
    </div>
  );
}
