"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";

export function CreatedKeyDialog({
  secret,
  onClose,
}: {
  secret: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={secret != null} onClose={() => {}} title="Virtual key created">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Copy this key now. It will not be shown again after you close this dialog.
        </p>
        <div>
          <Label htmlFor="created-key">API key</Label>
          <Input id="created-key" value={secret ?? ""} readOnly className="font-mono" />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (!secret) return;
              await navigator.clipboard.writeText(secret);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy key"}
          </Button>
          <Button
            onClick={() => {
              setCopied(false);
              onClose();
            }}
          >
            I saved it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
