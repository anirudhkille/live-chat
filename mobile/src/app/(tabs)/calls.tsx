import { useCallActions } from "@/features/calls/call-provider";
import { CallList } from "@/features/calls/components/call-list";
import type { CallType } from "@/features/calls/types";
import { useAuthStore } from "@/store/auth-store";
import type { CallLog } from "@/types/api";

export default function CallsScreen() {
  const calls = useCallActions();
  const currentUserId = useAuthStore((state) => state.user?.id);

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

  return <CallList onCall={handleCallBack} />;
}
