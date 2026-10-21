"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function E2ESetupDialog({
  open,
  onSetup,
  onClose,
  isPending,
  error,
  title = "Enable end-to-end encryption",
  description = "Choose a recovery passphrase. This is the only way to restore your keys on a new device. We cannot reset it for you.",
  submitLabel = "Enable encryption",
}: {
  open: boolean;
  onSetup: (passphrase: string) => void;
  onClose?: () => void;
  isPending: boolean;
  error: Error | null;
  title?: string;
  description?: string;
  submitLabel?: string;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");

  const canSubmit =
    passphrase.length >= 8 && passphrase === confirm && !isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose ?? (() => {})}
      title={title}
      description={description}
      footer={
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSetup(passphrase)}
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="e2e-passphrase">Recovery passphrase</Label>
          <Input
            id="e2e-passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="e2e-confirm">Confirm passphrase</Label>
          <Input
            id="e2e-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the passphrase"
            className="mt-1"
          />
        </div>
        {passphrase && confirm && passphrase !== confirm && (
          <p className="text-destructive text-xs">Passphrases do not match.</p>
        )}
        {error && <p className="text-destructive text-xs">{error.message}</p>}
      </div>
    </Dialog>
  );
}
