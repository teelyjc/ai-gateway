"use client";

import { useEffect, useState } from "react";
import { createKey, deleteKey, fetchKeys, fetchModels } from "@/lib/api";
import { CreateVirtualKeyInput, ModelInfo, VirtualKey, VirtualKeyList } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { KeyTable } from "@/components/keys/key-table";
import { NewKeyDialog } from "@/components/keys/new-key-dialog";
import { CreatedKeyDialog } from "@/components/keys/created-key-dialog";
import { EditBudgetDialog } from "@/components/keys/edit-budget-dialog";

const EMPTY_LIST: VirtualKeyList = {
  keys: [],
  total_count: 0,
  current_page: 1,
  total_pages: 0,
};

export default function KeysPage() {
  const [list, setList] = useState<VirtualKeyList>(EMPTY_LIST);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<VirtualKey | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [editTarget, setEditTarget] = useState<VirtualKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([fetchKeys(page), fetchModels()])
      .then(([keys, availableModels]) => {
        if (cancelled) return;
        setList(keys);
        setModels(availableModels);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load keys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reload]);

  async function handleCreate(payload: CreateVirtualKeyInput) {
    const result = await createKey(payload);
    setCreatedSecret(result.secret);
    setPage(1);
    setReload((value) => value + 1);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    setError("");
    try {
      await deleteKey(revokeTarget.token_id);
      setRevokeTarget(null);
      if (list.keys.length === 1 && page > 1) setPage((value) => value - 1);
      else setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to revoke key");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Virtual keys</h1>
          <p className="text-sm text-muted-foreground">
            {list.total_count} {list.total_count === 1 ? "key" : "keys"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New key</Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading keys…</p>
        ) : list.keys.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No virtual keys yet. Create one to start using the gateway.
          </p>
        ) : (
          <KeyTable
            keys={list.keys}
            onDelete={setRevokeTarget}
            onEditBudget={setEditTarget}
          />
        )}
      </Card>

      {list.total_pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {list.current_page} of {list.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= list.total_pages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <NewKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreate}
        modelOptions={models.map((model) => model.model_name)}
      />

      <CreatedKeyDialog secret={createdSecret} onClose={() => setCreatedSecret(null)} />

      <EditBudgetDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => setReload((value) => value + 1)}
      />

      <Dialog open={revokeTarget != null} onClose={() => !revoking && setRevokeTarget(null)} title="Revoke virtual key">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Revoke <span className="font-medium text-foreground">{revokeTarget?.key_alias ?? revokeTarget?.key_name}</span>?
            Applications using it will immediately lose access.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={revoking} onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={revoking} onClick={handleRevoke}>
              {revoking ? "Revoking…" : "Revoke key"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
