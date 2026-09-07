"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { IdentityKeys } from "@/lib/crypto/identity";
import { restoreFromBlob, type RecoveryBlob } from "@/lib/crypto/recovery";
import { saveKey } from "../api/user-key-api";
import {
  loadIdentityKeys,
  saveIdentityKeys,
  createAndUploadIdentity,
} from "../lib/keyManager";

export function useE2EIdentity() {
  const [keys, setKeys] = useState<IdentityKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadIdentityKeys()
      .then(setKeys)
      .finally(() => setLoading(false));
  }, []);

  const setupMutation = useMutation({
    mutationFn: async (passphrase: string) => {
      const { keys, recoveryBlob } = await createAndUploadIdentity(passphrase);
      await saveKey({ publicKey: keys.publicKey, recoveryBlob });
      return keys;
    },
    onSuccess: (newKeys) => {
      setKeys(newKeys);
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (args: {
      passphrase: string;
      recoveryBlob: RecoveryBlob;
    }) => {
      const result = await restoreFromBlob(args.passphrase, args.recoveryBlob);
      if (!result.ok) throw new Error(result.error);
      const restoredKeys: IdentityKeys = {
        masterSeed: result.keys.masterSeed,
        privateKey: result.keys.privateKey,
        publicKey: result.keys.publicKey,
      };
      await saveIdentityKeys(restoredKeys);
      return restoredKeys;
    },
    onSuccess: (restoredKeys) => {
      setKeys(restoredKeys);
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  return {
    keys,
    loading,
    setup: setupMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    isRestoring: restoreMutation.isPending,
    setupError: setupMutation.error,
    restoreError: restoreMutation.error,
  };
}
