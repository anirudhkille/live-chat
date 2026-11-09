"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { hasLocalIdentityMarker } from "../lib/keyManager";

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
    isSettingUp,
    setupError,
  } = useE2EIdentity();

  const provisioningRef = useRef(false);

  useEffect(() => {
    if (userKeyLoading || keysLoading) return;
    if (!userKey) return;
    if (keys || provisioningRef.current) return;

    const newDevice = !userKey.hasKey || !hasLocalIdentityMarker();
    if (!newDevice) return;

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

  return (
    <div className="bg-muted border-b p-3">
      <p className="text-sm font-medium">Encryption keys are missing</p>
      <p className="text-muted-foreground text-xs">
        This device no longer holds your keys, so older encrypted messages
        can&apos;t be read here. You can start fresh with new keys; old messages
        will stay in your conversation.
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
