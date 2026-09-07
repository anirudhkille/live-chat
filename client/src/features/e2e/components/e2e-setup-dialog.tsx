"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function E2ESetupDialog({
  open,
  onSetup,
  isPending,
  error,
}: {
  open: boolean;
  onSetup: (passphrase: string) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");

  const canSubmit =
    passphrase.length >= 8 && passphrase === confirm && !isPending;

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      title="Enable end-to-end encryption"
      description="Choose a recovery passphrase. This is the only way to restore your keys on a new device. We cannot reset it for you."
      footer={
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSetup(passphrase)}
        >
          {isPending ? "Setting up..." : "Enable encryption"}
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
