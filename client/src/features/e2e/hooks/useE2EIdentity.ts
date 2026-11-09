"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IdentityKeys } from "@/lib/crypto/identity";
import { restoreFromPasskeyBlob, type PasskeyUser } from "@/lib/crypto/passkey";
import {
  restoreFromBlob,
  type PasskeyRecoveryBlob,
  type RecoveryBlob,
} from "@/lib/crypto/recovery";
import { saveKey } from "../api/user-key-api";
import {
  loadIdentityKeys,
  saveIdentityKeys,
  createAndUploadIdentity,
  buildRecoveryBlobForKeys,
  buildPasskeyRecoveryBlobForKeys,
} from "../lib/keyManager";

const IDENTITY_QUERY_KEY = ["e2e-identity"];

export function useE2EIdentity() {
  const queryClient = useQueryClient();

  const identityQuery = useQuery({
    queryKey: IDENTITY_QUERY_KEY,
    queryFn: loadIdentityKeys,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setupMutation = useMutation({
    mutationFn: async (passphrase?: string) => {
      const { keys, recoveryBlob } = await createAndUploadIdentity(passphrase);
      await saveKey({ publicKey: keys.publicKey, recoveryBlob });
      return keys;
    },
    onSuccess: (newKeys) => {
      queryClient.setQueryData(IDENTITY_QUERY_KEY, newKeys);
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
      queryClient.setQueryData(IDENTITY_QUERY_KEY, restoredKeys);
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const passphraseMutation = useMutation({
    mutationFn: async (args: { passphrase: string; keys: IdentityKeys }) => {
      const recoveryBlob = await buildRecoveryBlobForKeys(
        args.passphrase,
        args.keys
      );
      await saveKey({ publicKey: args.keys.publicKey, recoveryBlob });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const passkeySetupMutation = useMutation({
    mutationFn: async (args: { user: PasskeyUser; keys: IdentityKeys }) => {
      const recoveryBlob = await buildPasskeyRecoveryBlobForKeys(
        args.user,
        args.keys
      );
      await saveKey({ publicKey: args.keys.publicKey, recoveryBlob });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const passkeyRestoreMutation = useMutation({
    mutationFn: async (recoveryBlob: PasskeyRecoveryBlob) => {
      const result = await restoreFromPasskeyBlob(recoveryBlob);
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
      queryClient.setQueryData(IDENTITY_QUERY_KEY, restoredKeys);
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const setup = useCallback(
    (passphrase?: string) => setupMutation.mutateAsync(passphrase),
    [setupMutation.mutateAsync]
  );

  return {
    keys: identityQuery.data ?? null,
    loading: identityQuery.isPending,
    setup,
    restore: restoreMutation.mutateAsync,
    addPassphrase: passphraseMutation.mutateAsync,
    addPasskey: passkeySetupMutation.mutateAsync,
    restoreWithPasskey: passkeyRestoreMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isAddingPassphrase: passphraseMutation.isPending,
    isAddingPasskey: passkeySetupMutation.isPending,
    isRestoringWithPasskey: passkeyRestoreMutation.isPending,
    setupError: setupMutation.error,
    restoreError: restoreMutation.error,
    addPassphraseError: passphraseMutation.error,
    addPasskeyError: passkeySetupMutation.error,
    passkeyRestoreError: passkeyRestoreMutation.error,
  };
}
