import { createContext, useCallback, useContext, type ReactNode } from "react";

import { CallOverlay } from "./call-overlay";
import { useCallStore } from "./call-store";
import { useCalls } from "./use-calls";

type CallActions = ReturnType<typeof useCalls>;

const CallActionsContext = createContext<CallActions | null>(null);

export function useCallActions() {
  const actions = useContext(CallActionsContext);
  if (!actions) {
    throw new Error("useCallActions must be used inside CallProvider");
  }
  return actions;
}

/**
 * Owns the single set of call socket listeners and the full-screen call
 * overlay for every authenticated route, mirroring the web CallProvider.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  const calls = useCalls();

  const handleClose = useCallback(() => {
    useCallStore.getState().reset();
  }, []);

  return (
    <CallActionsContext.Provider value={calls}>
      {children}
      <CallOverlay
        onAccept={calls.acceptCall}
        onDecline={calls.rejectCall}
        onCancel={calls.cancelOutgoing}
        onHangup={calls.hangup}
        onToggleMute={calls.toggleMute}
        onToggleCamera={calls.toggleCamera}
        onToggleSpeaker={calls.toggleSpeaker}
        onClose={handleClose}
      />
    </CallActionsContext.Provider>
  );
}
