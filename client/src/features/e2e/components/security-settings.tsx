"use client";

import { useState, useSyncExternalStore } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { isPasskeyRecoverySupported } from "@/lib/crypto/passkey";
import {
  isPasskeyRecoveryBlob,
  isPassphraseRecoveryBlob,
} from "@/lib/crypto/recovery";
import { useAuthStore } from "@/store/auth-store";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";
import { E2ESetupDialog } from "./e2e-setup-dialog";

function fingerprint(publicKey: string): string {
  return publicKey.slice(0, 16);
}

const subscribeToNothing = () => () => {};
const getServerPasskeySupport = () => false;

export function SecuritySettings() {
  const { data: userKey, isLoading: userKeyLoading } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    restore,
    restoreWithPasskey,
    setup,
    addPassphrase,
    addPasskey,
    isRestoring,
    isRestoringWithPasskey,
    isSettingUp,
    isAddingPassphrase,
    isAddingPasskey,
    restoreError,
    passkeyRestoreError,
    setupError,
    addPassphraseError,
    addPasskeyError,
  } = useE2EIdentity();
  const user = useAuthStore((s) => s.user);
  const [passphraseOpen, setPassphraseOpen] = useState(false);
  const passkeySupported = useSyncExternalStore(
    subscribeToNothing,
    isPasskeyRecoverySupported,
    getServerPasskeySupport
  );

  if (userKeyLoading || keysLoading) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  if (!userKey?.hasKey) {
    return (
      <div className="flex items-center gap-3 rounded-md border p-4">
        <ShieldAlert className="text-muted-foreground h-6 w-6" />
        <div>
          <p className="text-sm font-medium">Encryption not enabled</p>
          <p className="text-muted-foreground text-xs">
            Keys are created automatically the next time the app loads.
          </p>
        </div>
      </div>
    );
  }

  const passkeyBlob = isPasskeyRecoveryBlob(userKey.recoveryBlob)
    ? userKey.recoveryBlob
    : null;
  const passphraseBlob = isPassphraseRecoveryBlob(userKey.recoveryBlob)
    ? userKey.recoveryBlob
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-md border p-4">
        <ShieldCheck className="h-6 w-6 text-green-600" />
        <div>
          <p className="text-sm font-medium">End-to-end encryption enabled</p>
          <p className="text-muted-foreground text-xs">
            Your direct messages are encrypted on this device.
          </p>
        </div>
      </div>

      {!keys ? (
        <E2ERecoveryBanner
          onRestore={(passphrase) => {
            if (!passphraseBlob) return;
            restore({ passphrase, recoveryBlob: passphraseBlob });
          }}
          onRestorePasskey={
            passkeyBlob ? () => restoreWithPasskey(passkeyBlob) : undefined
          }
          usePasskey={Boolean(passkeyBlob)}
          onReset={(passphrase) => setup(passphrase)}
          isPending={isRestoring || isSettingUp || isRestoringWithPasskey}
          error={passkeyRestoreError ?? restoreError ?? setupError}
        />
      ) : (
        <>
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Public key fingerprint</p>
            <p className="text-muted-foreground mt-1 font-mono text-xs">
              {fingerprint(keys.publicKey)}
            </p>
          </div>

          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Key recovery</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {passkeyBlob
                ? "Passkey recovery is enabled. Use your device biometrics or PIN to restore your keys on another device."
                : passphraseBlob
                  ? "Recovery passphrase is set. You can also enable passkey recovery for a faster restore."
                  : "Not set. Your keys live only in this browser."}
            </p>
            {passkeySupported && !passkeyBlob && (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                disabled={isAddingPasskey || !user}
                onClick={() => {
                  if (!user) return;
                  addPasskey({ user, keys }).catch(() => {});
                }}
              >
                {isAddingPasskey
                  ? "Setting up passkey..."
                  : "Enable passkey recovery"}
              </Button>
            )}
            {!userKey.recoveryBlob && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 ml-2"
                onClick={() => setPassphraseOpen(true)}
              >
                Add recovery passphrase
              </Button>
            )}
            {addPasskeyError && (
              <p className="text-destructive mt-2 text-xs">
                {addPasskeyError.message}
              </p>
            )}
          </div>
        </>
      )}

      <E2ESetupDialog
        open={passphraseOpen}
        onClose={() => setPassphraseOpen(false)}
        onSetup={(passphrase) => {
          if (!keys) return;
          addPassphrase({ passphrase, keys })
            .then(() => setPassphraseOpen(false))
            .catch(() => {});
        }}
        isPending={isAddingPassphrase}
        error={(addPassphraseError ?? setupError) as Error | null}
        title="Set up recovery passphrase"
        description="Optional. Encrypts a copy of your keys so you can restore them on another device. We cannot reset this passphrase for you."
        submitLabel="Save passphrase"
      />
    </div>
  );
}
