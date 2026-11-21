"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IdentityKeys } from "@/lib/crypto/identity";
import { restoreFromPasskeyBlob, type PasskeyUser } from "@/lib/crypto/passkey";
import {
  restoreFromBlob,
  type PasskeyRecoveryBlob,
  type RecoveryBlob,
} from "@/lib/crypto/recovery";
import { useAuthStore } from "@/store/auth-store";
import { getOwnKey, saveKey } from "../api/user-key-api";
import {
  loadIdentityKeys,
  saveIdentityKeys,
  createAndUploadIdentity,
  buildRecoveryBlobForKeys,
  buildPasskeyRecoveryBlobForKeys,
  validateIdentityKeys,
} from "../lib/keyManager";
import { useUserKey } from "./useUserKey";

export function identityQueryKey(userId: string | null | undefined) {
  return ["e2e-identity", userId ?? null] as const;
}

type SetupArgs = {
  passphrase?: string;
  /**
   * Replacing an existing identity destroys the old recovery blob. Only an
   * explicit, user-confirmed reset may do that.
   */
  confirmRotation?: boolean;
};

export function useE2EIdentity() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // The server key is used to validate the local key bundle. If the two
  // disagree we refuse to use the local keys rather than decrypting with a
  // mismatched identity.
  const { data: userKey, isLoading: userKeyLoading } = useUserKey();
  const queryKey = identityQueryKey(userId);

  const identityQuery = useQuery({
    queryKey,
    queryFn: () => loadIdentityKeys(userId),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const candidateKeys = identityQuery.data ?? null;
  const serverPublicKey = userKey?.publicKey ?? null;
  const keys =
    candidateKeys &&
    (!serverPublicKey || candidateKeys.publicKey === serverPublicKey)
      ? candidateKeys
      : null;

  const setupInFlightRef = useRef<Promise<IdentityKeys> | null>(null);
  const setupOwnerRef = useRef<string | null>(userId);

  // Never let one account's in-flight setup satisfy another account's call.
  useEffect(() => {
    if (setupOwnerRef.current === userId) return;
    setupOwnerRef.current = userId;
    setupInFlightRef.current = null;
  }, [userId]);

  const setupMutation = useMutation({
    mutationFn: async ({ passphrase, confirmRotation }: SetupArgs) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId) {
        throw new Error("You must be signed in to create encryption keys");
      }

      // Check the server again at mutation time. Auto-provisioning must never
      // replace keys that were created on another device, and an existing
      // recovery blob may only be dropped after an explicit rotation.
      const { data: serverKey } = await getOwnKey();
      if (serverKey.hasKey && !confirmRotation) {
        throw new Error(
          "This account already has encryption keys. Restore them or confirm a reset."
        );
      }

      if (
        serverKey.hasKey &&
        serverKey.recoveryBlob &&
        !passphrase &&
        !confirmRotation
      ) {
        throw new Error(
          "Recovery is enabled for this account. Confirm the key reset to continue."
        );
      }

      const { keys: newKeys, recoveryBlob } = await createAndUploadIdentity(
        currentUserId,
        passphrase
      );

      await saveKey({ publicKey: newKeys.publicKey, recoveryBlob });
      return newKeys;
    },
    onSuccess: (newKeys) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        queryClient.setQueryData(identityQueryKey(currentUserId), newKeys);
      }
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (args: {
      passphrase: string;
      recoveryBlob: RecoveryBlob;
    }) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId)
        throw new Error("You must be signed in to restore keys");

      const result = await restoreFromBlob(args.passphrase, args.recoveryBlob);
      if (!result.ok) throw new Error(result.error);
      const restoredKeys: IdentityKeys = {
        masterSeed: result.keys.masterSeed,
        privateKey: result.keys.privateKey,
        publicKey: result.keys.publicKey,
      };

      // A recovery blob is only useful if it restores the account's current
      // identity. Refuse a valid-looking bundle from another account/key set.
      const { data: serverKey } = await getOwnKey();
      if (
        !validateIdentityKeys(restoredKeys, serverKey.publicKey ?? null) ||
        (serverKey.hasKey && serverKey.publicKey !== restoredKeys.publicKey)
      ) {
        throw new Error(
          "Those recovery keys do not match this account. Ask an existing device for the current recovery key."
        );
      }

      await saveIdentityKeys(currentUserId, restoredKeys);
      return restoredKeys;
    },
    onSuccess: (restoredKeys) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        queryClient.setQueryData(identityQueryKey(currentUserId), restoredKeys);
      }
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  // If keys were created locally but the upload failed (offline, 5xx), the
  // server has no public key. Publishing them is safe because it never
  // replaces an existing server identity.
  const publishMutation = useMutation({
    mutationFn: async () => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId)
        throw new Error("You must be signed in to publish keys");

      const localKeys = await loadIdentityKeys(currentUserId);
      if (!localKeys) throw new Error("No local encryption keys were found");

      const { data: serverKey } = await getOwnKey();
      if (serverKey.hasKey) {
        if (serverKey.publicKey === localKeys.publicKey) return localKeys;
        throw new Error(
          "This account already has different encryption keys. Restore them instead."
        );
      }

      await saveKey({ publicKey: localKeys.publicKey, recoveryBlob: null });
      return localKeys;
    },
    onSuccess: (publishedKeys) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        queryClient.setQueryData(
          identityQueryKey(currentUserId),
          publishedKeys
        );
      }
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
      const currentUserId = useAuthStore.getState().user?.id;
      if (!currentUserId)
        throw new Error("You must be signed in to restore keys");

      const result = await restoreFromPasskeyBlob(recoveryBlob);
      if (!result.ok) throw new Error(result.error);
      const restoredKeys: IdentityKeys = {
        masterSeed: result.keys.masterSeed,
        privateKey: result.keys.privateKey,
        publicKey: result.keys.publicKey,
      };

      const { data: serverKey } = await getOwnKey();
      if (
        !validateIdentityKeys(restoredKeys, serverKey.publicKey ?? null) ||
        (serverKey.hasKey && serverKey.publicKey !== restoredKeys.publicKey)
      ) {
        throw new Error(
          "Those recovery keys do not match this account. Ask an existing device for the current recovery key."
        );
      }

      await saveIdentityKeys(currentUserId, restoredKeys);
      return restoredKeys;
    },
    onSuccess: (restoredKeys) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (currentUserId) {
        queryClient.setQueryData(identityQueryKey(currentUserId), restoredKeys);
      }
      queryClient.invalidateQueries({ queryKey: ["user-key", "me"] });
    },
  });

  /**
   * Create (or explicitly rotate) the identity. Single-flight: concurrent
   * callers share the same promise instead of creating two identities.
   */
  const { mutateAsync: setupMutateAsync } = setupMutation;
  const setup = useCallback(
    (passphrase?: string, options?: { confirmRotation?: boolean }) => {
      if (setupInFlightRef.current) return setupInFlightRef.current;

      const promise = setupMutateAsync({
        passphrase,
        confirmRotation: options?.confirmRotation ?? false,
      }).finally(() => {
        setupInFlightRef.current = null;
      });
      setupInFlightRef.current = promise;
      return promise;
    },
    [setupMutateAsync]
  );

  return {
    keys,
    loading: userId ? identityQuery.isPending || userKeyLoading : false,
    setup,
    publishLocalKeys: publishMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    addPassphrase: passphraseMutation.mutateAsync,
    addPasskey: passkeySetupMutation.mutateAsync,
    restoreWithPasskey: passkeyRestoreMutation.mutateAsync,
    isSettingUp: setupMutation.isPending,
    isPublishing: publishMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isAddingPassphrase: passphraseMutation.isPending,
    isAddingPasskey: passkeySetupMutation.isPending,
    isRestoringWithPasskey: passkeyRestoreMutation.isPending,
    setupError: setupMutation.error,
    publishError: publishMutation.error,
    restoreError: restoreMutation.error,
    addPassphraseError: passphraseMutation.error,
    addPasskeyError: passkeySetupMutation.error,
    passkeyRestoreError: passkeyRestoreMutation.error,
  };
}
