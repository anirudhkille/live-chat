"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, type ReactNode } from "react";

import { useCallStore } from "./call-store";
import { useCalls } from "./use-calls";

const CallOverlay = dynamic(
  () => import("./call-overlay").then((m) => m.CallOverlay),
  { ssr: false }
);

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
 * Owns the single set of call socket listeners and the call overlay for every
 * authenticated route. Previously each page mounted its own useCalls(), so an
 * incoming call while the user was on settings, search or the conversation list
 * reached no listener and was dropped.
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
        onClose={handleClose}
      />
    </CallActionsContext.Provider>
  );
}
