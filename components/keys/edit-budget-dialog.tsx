"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { updateKeyBudget } from "@/lib/api";
import { VirtualKey } from "@/lib/types";

export function EditBudgetDialog({
  target,
  onClose,
  onSaved,
}: {
  target: VirtualKey | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [maxBudget, setMaxBudget] = useState("");
  const [duration, setDuration] = useState("1mo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setMaxBudget(target.max_budget != null ? String(target.max_budget) : "");
      setDuration(target.budget_duration ?? "1mo");
      setError("");
    }
  }, [target]);

  async function save() {
    if (!target) return;
    setError("");
    const amount = Number(maxBudget);
    if (!amount || amount <= 0) return setError("Budget must be greater than zero");
    if (amount > 1000000) return setError("Budget must be 1,000,000 or less");
    setSubmitting(true);
    try {
      await updateKeyBudget(target.token_id, {
        max_budget: amount,
        budget_duration: duration as "1d" | "1w" | "1mo" | "3mo",
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update budget");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={target != null} onClose={onClose} title="Edit budget">
      <div className="space-y-4">
        <div className="font-mono text-xs text-muted-foreground">
          {target?.key_name}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-budget">Max budget ($)</Label>
            <Input
              id="edit-budget"
              type="number"
              min="0.01"
              step="0.01"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-duration">Budget duration</Label>
            <Select
              id="edit-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="1d">1 day</option>
              <option value="1w">1 week</option>
              <option value="1mo">1 month</option>
              <option value="3mo">3 months</option>
            </Select>
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "Saving…" : "Save budget"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
