"use client";

import dynamic from "next/dynamic";

import { BottomNav } from "@/layout/bottom-nav";
import { Sidebar } from "@/layout/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useCallStore } from "@/features/calls/call-store";
import { useCalls } from "@/features/calls/use-calls";
import { CallList } from "@/features/calls/components/call-list";
import type { CallType } from "@/features/calls/call-store";
import type { CallLog } from "@/types/api";

const CallOverlay = dynamic(
  () => import("@/features/calls/call-overlay").then((m) => m.CallOverlay),
  { ssr: false }
);

export default function CallsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const calls = useCalls();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const handleCallBack = (log: CallLog, type: CallType) => {
    const peer = log.callerId === currentUserId ? log.callee : log.caller;
    if (!peer) return;
    calls.startCall({
      type,
      conversationId: log.conversationId,
      peerId: peer.id,
      peerName: peer.name,
    });
  };

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar>
          <CallList onCall={handleCallBack} />
        </Sidebar>
        <main className="bg-background hidden min-w-0 flex-1 overflow-hidden md:block">
          {children}
        </main>
      </div>
      <BottomNav />
      <CallOverlay
        onAccept={calls.acceptCall}
        onDecline={calls.rejectCall}
        onCancel={calls.cancelOutgoing}
        onHangup={calls.hangup}
        onClose={() => useCallStore.getState().reset()}
      />
    </div>
  );
}
