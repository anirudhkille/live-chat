"use client";

import { useUserKey } from "@/features/e2e/hooks/useUserKey";
import { useE2EIdentity } from "@/features/e2e/hooks/useE2EIdentity";
import { E2ESetupDialog } from "./e2e-setup-dialog";
import { E2ERecoveryBanner } from "./e2e-recovery-banner";

export function E2EKeyGate() {
  const { data: userKey, isLoading: userKeyLoading } = useUserKey();
  const {
    keys,
    loading: keysLoading,
    setup,
    restore,
    isSettingUp,
    isRestoring,
    setupError,
    restoreError,
  } = useE2EIdentity();

  if (userKeyLoading || keysLoading) return null;

  if (!userKey?.hasKey) {
    return (
      <E2ESetupDialog
        open
        onSetup={setup}
        isPending={isSettingUp}
        error={setupError}
      />
    );
  }

  if (!keys && userKey.recoveryBlob) {
    return (
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
    );
  }

  return null;
}
