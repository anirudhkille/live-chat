"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";

function fingerprint(publicKey: string): string {
  return publicKey.slice(0, 16);
}

export function SecuritySettings() {
  const { data: userKey, isLoading: userKeyLoading } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    restore,
    isRestoring,
    restoreError,
  } = useE2EIdentity();

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
            Set up end-to-end encryption from the prompt that appears in the
            app.
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

      {keys ? (
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Public key fingerprint</p>
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            {fingerprint(keys.publicKey)}
          </p>
        </div>
      ) : (
        <E2ERecoveryBanner
          onRestore={(passphrase) =>
            restore({
              passphrase,
              recoveryBlob: userKey.recoveryBlob as Parameters<
                typeof restore
              >[0]["recoveryBlob"],
            })
          }
          isPending={isRestoring}
          error={restoreError}
        />
      )}
    </div>
  );
}
