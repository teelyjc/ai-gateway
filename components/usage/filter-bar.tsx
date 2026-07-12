"use client";

import { Select } from "@/components/ui/input";

export function FilterBar({
  range,
  model,
  rangeOptions,
  modelOptions,
  onRange,
  onModel,
}: {
  range: string;
  model: string;
  rangeOptions: string[];
  modelOptions: string[];
  onRange: (v: string) => void;
  onModel: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={range}
        onChange={(e) => onRange(e.target.value)}
        className="w-auto"
      >
        {rangeOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      <Select
        value={model}
        onChange={(e) => onModel(e.target.value)}
        className="w-auto"
      >
        <option value="all">All models</option>
        {modelOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
    </div>
  );
}
