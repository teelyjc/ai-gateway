"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CreateVirtualKeyInput } from "@/lib/types";

export function NewKeyDialog({
  open,
  onClose,
  onCreated,
  modelOptions,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (payload: CreateVirtualKeyInput) => Promise<void>;
  modelOptions: string[];
}) {
  const [alias, setAlias] = useState("");
  const [maxBudget, setMaxBudget] = useState("10");
  const [duration, setDuration] = useState("1mo");
  const [models, setModels] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleModel = (m: string) =>
    setModels((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  return (
    <Dialog open={open} onClose={onClose} title="Create virtual key">
      <div className="space-y-4">
        <div>
          <Label htmlFor="alias">Key alias</Label>
          <Input
            id="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="my-app"
          />
        </div>
        <div>
          <Label>Allowed models</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {modelOptions.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleModel(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (models.includes(m)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-muted")
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="budget">Max budget ($)</Label>
            <Input
              id="budget"
              type="number"
              min="0.01"
              step="0.01"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="duration">Budget duration</Label>
            <Select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
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
          <Button
            disabled={submitting}
            onClick={async () => {
              setError("");
              if (!alias.trim()) return setError("Alias is required");
              if (models.length === 0) return setError("Select at least one model");
              if (Number(maxBudget) <= 0) return setError("Budget must be greater than zero");

              setSubmitting(true);
              try {
                await onCreated({
                  key_alias: alias.trim(),
                  models,
                  max_budget: Number(maxBudget),
                  budget_duration: duration as CreateVirtualKeyInput["budget_duration"],
                });
                setAlias("");
                setModels([]);
                onClose();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Unable to create key");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Creating…" : "Create key"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
