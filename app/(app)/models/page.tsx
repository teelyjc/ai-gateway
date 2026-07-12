"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { fetchModels } from "@/lib/api";
import { ModelInfo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

function formatCost(value: number) {
  if (value === 0) return "Free";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load models"))
      .finally(() => setLoading(false));
  }, []);

  const filteredModels = deferredQuery
    ? models.filter((model) =>
        [model.model_name, model.litellm_model, model.provider].some((value) =>
          value.toLowerCase().includes(deferredQuery)
        )
      )
    : models;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-lg font-semibold">Models</h1>
          <p className="text-sm text-muted-foreground">
            {models.length} exposed {models.length === 1 ? "model" : "models"} and base pricing per 1M tokens.
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models or providers"
          aria-label="Search models"
          className="sm:w-72"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading models…</p>
        ) : filteredModels.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query ? "No models match your search." : "No models are currently exposed."}
          </p>
        ) : (
          <Table className="min-w-[760px]">
            <THead>
              <TR className="border-t-0">
                <TH>Model</TH>
                <TH>Provider</TH>
                <TH className="text-right">Context</TH>
                <TH className="text-right">Input / 1M</TH>
                <TH className="text-right">Output / 1M</TH>
              </TR>
            </THead>
            <TBody>
              {filteredModels.map((model) => (
                <TR key={`${model.model_name}-${model.litellm_model}`} className="hover:bg-zinc-50">
                  <TD>
                    <div className="font-medium text-foreground">{model.model_name}</div>
                    <div className="max-w-md truncate font-mono text-xs text-muted-foreground">
                      {model.litellm_model}
                    </div>
                  </TD>
                  <TD>
                    <Badge className="capitalize">{model.provider}</Badge>
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {model.context_window ? model.context_window.toLocaleString() : "N/A"}
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {formatCost(model.input_cost_per_1m)}
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {formatCost(model.output_cost_per_1m)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
