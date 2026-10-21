"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";
import { E2ESetupDialog } from "./e2e-setup-dialog";

function fingerprint(publicKey: string): string {
  return publicKey.slice(0, 16);
}

export function SecuritySettings() {
  const { data: userKey, isLoading: userKeyLoading } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    restore,
    setup,
    addPassphrase,
    isRestoring,
    isSettingUp,
    isAddingPassphrase,
    restoreError,
    setupError,
    addPassphraseError,
  } = useE2EIdentity();
  const [passphraseOpen, setPassphraseOpen] = useState(false);

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
          onRestore={(passphrase) =>
            restore({
              passphrase,
              recoveryBlob: userKey.recoveryBlob as Parameters<
                typeof restore
              >[0]["recoveryBlob"],
            })
          }
          onReset={(passphrase) => setup(passphrase)}
          isPending={isRestoring || isSettingUp}
          error={(restoreError ?? setupError) as Error | null}
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
            <p className="text-sm font-medium">Recovery passphrase</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {userKey.recoveryBlob
                ? "Set. It is only needed to restore your keys on another device."
                : "Not set. Your keys live only in this browser. Add a passphrase if you want to move to another device."}
            </p>
            {!userKey.recoveryBlob && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setPassphraseOpen(true)}
              >
                Add recovery passphrase
              </Button>
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
