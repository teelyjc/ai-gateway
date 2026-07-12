"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { BudgetProgress } from "./budget-progress";
import { VirtualKey } from "@/lib/types";

const statusTone = {
  active: "solid",
  expired: "outline",
  blocked: "default",
} as const;

function maskKey(name: string): string {
  if (!name) return "";
  const last4 = name.slice(-4);
  return `••••••••${last4}`;
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function KeyTable({
  keys,
  onDelete,
  onEditBudget,
}: {
  keys: VirtualKey[];
  onDelete: (key: VirtualKey) => void;
  onEditBudget: (key: VirtualKey) => void;
}) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyKey = async (k: VirtualKey) => {
    try {
      await navigator.clipboard.writeText(k.key_name);
      setCopiedId(k.token_id);
      setTimeout(() => setCopiedId((cur) => (cur === k.token_id ? null : cur)), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <Table>
      <THead>
        <TR>
          <TH>Alias</TH>
          <TH>Models</TH>
          <TH>Budget</TH>
          <TH>Status</TH>
          <TH className="sticky right-0 z-10 bg-white text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {keys.map((k) => {
          const isRevealed = revealed.has(k.token_id);
          const display = isRevealed ? k.key_name : maskKey(k.key_name);
          return (
            <TR key={k.token_id}>
              <TD>
                <div className="font-medium text-foreground">{k.key_alias ?? "Untitled"}</div>
                <div className="mt-1 flex items-center gap-1">
                  <code className="font-mono text-xs text-muted-foreground">{display}</code>
                  <button
                    type="button"
                    onClick={() => toggleReveal(k.token_id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={isRevealed ? "Hide key" : "Reveal key"}
                    aria-label={isRevealed ? "Hide key" : "Reveal key"}
                  >
                    {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyKey(k)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copy key"
                    aria-label="Copy key"
                  >
                    <CopyIcon />
                  </button>
                  {copiedId === k.token_id && (
                    <span className="text-xs text-accent">Copied</span>
                  )}
                </div>
              </TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {k.models.map((m) => (
                    <Badge key={m}>{m}</Badge>
                  ))}
                </div>
              </TD>
              <TD className="w-44">
                <BudgetProgress spend={k.spend} maxBudget={k.max_budget} />
              </TD>
              <TD>
                <Badge tone={statusTone[k.status]}>{k.status}</Badge>
              </TD>
              <TD className="sticky right-0 z-10 bg-white text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditBudget(k)}
                  disabled={k.status === "expired"}
                >
                  Edit budget
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(k)}
                  disabled={k.status !== "active"}
                >
                  Revoke
                </Button>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
