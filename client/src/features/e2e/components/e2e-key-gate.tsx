"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { useAuthStore } from "@/store/auth-store";
import {
  isPasskeyRecoveryBlob,
  isPassphraseRecoveryBlob,
  type PasskeyRecoveryBlob,
  type PassphraseRecoveryBlob,
} from "@/lib/crypto/recovery";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";

export function E2EKeyGate() {
  const {
    data: userKey,
    isLoading: userKeyLoading,
    isFetching: userKeyFetching,
    isError: userKeyError,
    refetch: refetchUserKey,
  } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    setup,
    publishLocalKeys,
    isSettingUp,
    isPublishing,
    setupError,
    publishError,
    restore,
    restoreWithPasskey,
    isRestoring,
    isRestoringWithPasskey,
    restoreError,
    passkeyRestoreError,
  } = useE2EIdentity();

  const provisioningRef = useRef(false);
  const retryingRef = useRef(false);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // A new account must get its own auto-provision attempt.
  useEffect(() => {
    provisioningRef.current = false;
    retryingRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (userKeyLoading || keysLoading) return;
    if (!userKey) return;

    // Only auto-provision when the account has no key at all. If local keys
    // exist but the upload previously failed, publish those exact keys rather
    // than generating a new identity. Never overwrite an existing server key.
    if (userKey.hasKey) return;
    if (provisioningRef.current) return;

    provisioningRef.current = true;
    const provision = keys ? publishLocalKeys() : setup();
    provision.catch(() => {
      provisioningRef.current = false;
    });
  }, [
    userKeyLoading,
    keysLoading,
    userKey,
    keys,
    setup,
    publishLocalKeys,
    userId,
  ]);

  const handleRetryStatus = () => {
    if (retryingRef.current || userKeyFetching) return;
    retryingRef.current = true;
    refetchUserKey().finally(() => {
      retryingRef.current = false;
    });
  };

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
          disabled={userKeyFetching}
          onClick={handleRetryStatus}
        >
          {userKeyFetching ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  if (!userKey.hasKey) {
    const provisionError = setupError ?? publishError;
    if (!provisionError) return null;

    return (
      <div className="bg-muted border-b p-3">
        <p className="text-destructive text-sm font-medium">
          Could not enable encryption
        </p>
        <p className="text-muted-foreground text-xs">
          {provisionError.message}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={isSettingUp || isPublishing}
          onClick={() => {
            if (isSettingUp || isPublishing) return;
            const retry = keys ? publishLocalKeys() : setup();
            retry.catch(() => {});
          }}
        >
          {isSettingUp || isPublishing ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  if (keys) return null;

  // The account has keys on the server but this device has none. Prefer the
  // existing recovery flow; reset is a separate, confirmed action.
  const passkeyBlob = isPasskeyRecoveryBlob(userKey.recoveryBlob)
    ? (userKey.recoveryBlob as PasskeyRecoveryBlob)
    : null;
  const passphraseBlob = isPassphraseRecoveryBlob(userKey.recoveryBlob)
    ? (userKey.recoveryBlob as PassphraseRecoveryBlob)
    : null;

  return (
    <E2ERecoveryBanner
      onRestore={(passphrase) => {
        if (!passphraseBlob) return;
        restore({ passphrase, recoveryBlob: passphraseBlob }).catch(() => {});
      }}
      onRestorePasskey={
        passkeyBlob
          ? () => restoreWithPasskey(passkeyBlob).catch(() => {})
          : undefined
      }
      usePasskey={Boolean(passkeyBlob)}
      onReset={(passphrase) => {
        // The banner's two-step confirmation is the explicit rotation signal.
        setup(passphrase, { confirmRotation: true }).catch(() => {});
      }}
      isPending={isRestoring || isSettingUp || isRestoringWithPasskey}
      error={passkeyRestoreError ?? restoreError ?? setupError}
    />
  );
}
