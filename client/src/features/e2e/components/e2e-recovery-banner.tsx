"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function E2ERecoveryBanner({
  onRestore,
  isPending,
  error,
}: {
  onRestore: (passphrase: string) => void;
  isPending: boolean;
  error: Error | null;
}) {
  const [passphrase, setPassphrase] = useState("");

  return (
    <div className="bg-muted border-b p-3">
      <p className="text-sm font-medium">Restore encryption keys</p>
      <p className="text-muted-foreground text-xs">
        Enter your recovery passphrase to read encrypted messages on this
        device.
      </p>
      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="e2e-recovery-passphrase" className="sr-only">
            Recovery passphrase
          </Label>
          <Input
            id="e2e-recovery-passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Recovery passphrase"
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          disabled={!passphrase || isPending}
          onClick={() => onRestore(passphrase)}
        >
          {isPending ? "Restoring..." : "Restore"}
        </Button>
      </div>
      {error && (
        <p className="text-destructive mt-2 text-xs">{error.message}</p>
      )}
    </div>
  );
}
