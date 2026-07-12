"use client";

import { useEffect, useState } from "react";
import { fetchModels } from "@/lib/api";
import {
  AgentConfigTarget,
  generateAgentConfig,
} from "@/lib/agent-config";
import type { ModelInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";

const TARGETS = [
  { value: "opencode", label: "OpenCode" },
  { value: "claude", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];

export function AgentConfigGenerator({ defaultBaseUrl }: { defaultBaseUrl: string }) {
  const [target, setTarget] = useState<AgentConfigTarget>("opencode");
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [key, setKey] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"config" | "env" | null>(null);

  useEffect(() => {
    fetchModels()
      .then((items) => {
        setModels(items);
        setSelectedModels((current) =>
          current.length > 0 ? current : items[0] ? [items[0].model_name] : []
        );
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load models"))
      .finally(() => setLoading(false));
  }, []);

  const generated = generateAgentConfig({ target, baseUrl, key, selectedModels, models });
  const allSelected = models.length > 0 && selectedModels.length === models.length;

  function toggleModel(modelName: string) {
    setSelectedModels((current) => {
      if (current.includes(modelName)) {
        return current.length === 1 ? current : current.filter((item) => item !== modelName);
      }
      return [...current, modelName];
    });
  }

  async function copy(value: string, type: "config" | "env") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1500);
  }

  function download() {
    const blob = new Blob([generated.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = generated.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Agent configs</h1>
        <p className="text-sm text-muted-foreground">
          Generate client configuration for your LiteLLM virtual key.
        </p>
      </div>

      <Tabs
        tabs={TARGETS}
        active={target}
        onChange={(value) => setTarget(value as AgentConfigTarget)}
      />

      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit space-y-4">
          <div>
            <Label htmlFor="gateway-url">Gateway URL</Label>
            <Input
              id="gateway-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://gateway.example.com"
            />
          </div>
          <div>
            <Label htmlFor="virtual-key">Virtual key</Label>
            <Input
              id="virtual-key"
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Kept only in this page&apos;s memory. It is never sent to this app&apos;s server.
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Models</Label>
              <span className="text-xs text-muted-foreground">
                {selectedModels.length} selected
              </span>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              <button
                type="button"
                disabled={loading || models.length === 0}
                onClick={() =>
                  setSelectedModels(
                    allSelected
                      ? models[0]
                        ? [models[0].model_name]
                        : []
                      : models.map((item) => item.model_name)
                  )
                }
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                  allSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                    allSelected ? "border-white bg-white text-black" : "border-zinc-300"
                  }`}
                >
                  {allSelected ? "✓" : ""}
                </span>
                All models
              </button>
              {models.map((item) => {
                const selected = selectedModels.includes(item.model_name);
                return (
                  <button
                    key={item.model_name}
                    type="button"
                    onClick={() => toggleModel(item.model_name)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                      selected ? "bg-zinc-100 text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        selected ? "border-black bg-black text-white" : "border-zinc-300"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="truncate">{item.model_name}</span>
                  </button>
                );
              })}
            </div>
            {target !== "opencode" && selectedModels.length > 1 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                The first selected model is the default. {target === "codex" ? "Each selection also gets a profile." : "Gateway discovery exposes the remaining models."}
              </p>
            )}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="rounded-xl border border-border bg-zinc-50 px-3 py-2 text-xs text-muted-foreground">
            Do not commit generated files or shell scripts containing a virtual key.
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <div className="text-sm font-medium">{generated.filename}</div>
                <div className="text-xs text-muted-foreground">{generated.installPath}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(generated.content, "config")}>
                  {copied === "config" ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" onClick={download}>Download</Button>
              </div>
            </div>
            <pre className="max-h-[520px] overflow-auto bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
              <code>{generated.content}</code>
            </pre>
          </Card>

          {generated.environment && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="text-sm font-medium">Environment</div>
                <Button variant="outline" size="sm" onClick={() => copy(generated.environment!, "env")}>
                  {copied === "env" ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="overflow-x-auto bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
                <code>{generated.environment}</code>
              </pre>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
