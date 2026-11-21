"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";

import { resetConversationRooms } from "@/lib/socket";
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

  // The provider unmounts when the authenticated shell goes away (logout or an
  // account switch). Drop every room subscription so the next session starts
  // clean instead of re-joining the previous user's conversations.
  useEffect(() => {
    return () => {
      resetConversationRooms();
    };
  }, []);

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
        onClose={handleClose}
      />
    </CallActionsContext.Provider>
  );
}
