"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { isPasskeyRecoveryBlob } from "@/lib/crypto/recovery";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";

export function E2EKeyGate() {
  const {
    data: userKey,
    isLoading: userKeyLoading,
    isError: userKeyError,
    refetch: refetchUserKey,
  } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    setup,
    restore,
    restoreWithPasskey,
    isSettingUp,
    isRestoring,
    isRestoringWithPasskey,
    setupError,
    restoreError,
    passkeyRestoreError,
  } = useE2EIdentity();

  const provisioningRef = useRef(false);

  useEffect(() => {
    if (userKeyLoading || keysLoading) return;
    if (!userKey || userKey.hasKey) return;
    if (keys || provisioningRef.current) return;

    provisioningRef.current = true;
    setup().catch(() => {
      provisioningRef.current = false;
    });
  }, [userKeyLoading, keysLoading, userKey, keys, setup]);

  if (userKeyLoading || keysLoading) return null;

  if (!userKey) {
    if (!userKeyError) return null;

    return (
      <div className="bg-muted border-b p-3">
        <p className="text-destructive text-sm font-medium">
          Could not check encryption status
        </p>
        <p className="text-muted-foreground text-xs">
          Encryption keys were left untouched.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetchUserKey()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!userKey.hasKey) {
    if (!setupError) return null;

    return (
      <div className="bg-muted border-b p-3">
        <p className="text-destructive text-sm font-medium">
          Could not enable encryption
        </p>
        <p className="text-muted-foreground text-xs">{setupError.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={isSettingUp}
          onClick={() => setup()}
        >
          {isSettingUp ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  if (keys) return null;

  if (userKey.recoveryBlob) {
    const passkeyBlob = isPasskeyRecoveryBlob(userKey.recoveryBlob)
      ? userKey.recoveryBlob
      : null;

    return (
      <E2ERecoveryBanner
        onRestore={(passphrase) => {
          if (passkeyBlob) return;
          restore({
            passphrase,
            recoveryBlob: userKey.recoveryBlob as Parameters<
              typeof restore
            >[0]["recoveryBlob"],
          });
        }}
        onRestorePasskey={
          passkeyBlob ? () => restoreWithPasskey(passkeyBlob) : undefined
        }
        usePasskey={Boolean(passkeyBlob)}
        onReset={(passphrase) => setup(passphrase)}
        isPending={isRestoring || isSettingUp || isRestoringWithPasskey}
        error={
          (passkeyRestoreError ?? restoreError ?? setupError) as Error | null
        }
      />
    );
  }

  return (
    <div className="bg-muted border-b p-3">
      <p className="text-sm font-medium">Encryption keys are missing</p>
      <p className="text-muted-foreground text-xs">
        This device does not hold your keys and no recovery passphrase was set
        up, so encrypted messages cannot be read here.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={isSettingUp}
        onClick={() => setup()}
      >
        {isSettingUp ? "Creating keys..." : "Create new keys"}
      </Button>
      {setupError && (
        <p className="text-destructive mt-2 text-xs">{setupError.message}</p>
      )}
    </div>
  );
}
