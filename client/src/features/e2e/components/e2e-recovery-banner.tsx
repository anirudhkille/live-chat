"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "restore" | "reset";

export function E2ERecoveryBanner({
  onRestore,
  onReset,
  isPending,
  error,
}: {
  onRestore: (passphrase: string) => void;
  onReset: (passphrase: string) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [mode, setMode] = useState<Mode>("restore");
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetMismatch = Boolean(
    mode === "reset" && confirmPassphrase && passphrase !== confirmPassphrase
  );

  const handleSubmit = () => {
    if (!passphrase) return;
    if (mode === "reset") {
      if (!showResetConfirm) {
        setShowResetConfirm(true);
        return;
      }
      if (passphrase !== confirmPassphrase) return;
      onReset(passphrase);
      setPassphrase("");
      setConfirmPassphrase("");
      setShowResetConfirm(false);
    } else {
      onRestore(passphrase);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassphrase("");
    setConfirmPassphrase("");
    setShowResetConfirm(false);
  };

  return (
    <div className="bg-muted border-b p-3">
      {mode === "restore" ? (
        <>
          <p className="text-sm font-medium">Restore encryption keys</p>
          <p className="text-muted-foreground text-xs">
            Enter your recovery passphrase to read encrypted messages on this
            device.
          </p>
        </>
      ) : (
        <>
          <p className="text-destructive text-sm font-medium">
            Reset encryption keys
          </p>
          <p className="text-muted-foreground text-xs">
            Create new keys. You will not be able to read previously encrypted
            messages.
          </p>
        </>
      )}

      <div className="mt-2 grid gap-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="e2e-recovery-passphrase" className="sr-only">
              {mode === "restore" ? "Recovery passphrase" : "New passphrase"}
            </Label>
            <Input
              id="e2e-recovery-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder={
                mode === "restore" ? "Recovery passphrase" : "New passphrase"
              }
              disabled={isPending}
            />
          </div>
          <Button
            type="button"
            variant={mode === "reset" ? "destructive" : "default"}
            disabled={!passphrase || isPending || resetMismatch}
            onClick={handleSubmit}
          >
            {isPending
              ? mode === "reset"
                ? "Resetting..."
                : "Restoring..."
              : mode === "reset"
                ? showResetConfirm
                  ? "Confirm reset"
                  : "Reset keys"
                : "Restore"}
          </Button>
        </div>

        {mode === "reset" && showResetConfirm && (
          <div className="grid gap-2">
            <Label htmlFor="e2e-confirm-passphrase" className="sr-only">
              Confirm new passphrase
            </Label>
            <Input
              id="e2e-confirm-passphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm new passphrase"
              disabled={isPending}
            />
            <p className="text-destructive text-xs">
              This will replace your existing keys. Previous encrypted messages
              cannot be recovered.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-destructive mt-2 text-xs">{error.message}</p>
      )}

      <div className="mt-2 flex items-center gap-2 text-xs">
        {mode === "restore" ? (
          <>
            <span className="text-muted-foreground">
              Don&apos;t remember it?
            </span>
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="text-destructive hover:underline"
            >
              Reset keys
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("restore")}
            className="text-link hover:underline"
          >
            I remember my passphrase
          </button>
        )}
      </div>
    </div>
  );
}
