"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { E2EKeyGate } from "@/features/e2e/components/e2e-key-gate";
import { CallProvider } from "@/features/calls/call-provider";
import { useAuth } from "@/hooks/use-auth";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth-store";

/**
 * Client-side auth gate for the protected segment. The refresh cookie lives
 * on the API origin so Next middleware can't read it - session checks happen
 * here against the hydrated zustand store instead.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, hasHydrated } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user?.name) {
      router.replace("/complete-profile");
    }
  }, [router, token, user, hasHydrated]);

  // Connect for the lifetime of the signed-in user only. A token refresh
  // changes `token` but not `userId`, and must not tear down live rooms.
  useEffect(() => {
    if (!hasHydrated || !userId) return;

    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;

    socket.auth = { token: currentToken };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [hasHydrated, userId]);

  // Keep the handshake credentials fresh without reconnecting.
  useEffect(() => {
    if (!token) return;
    socket.auth = { token };
  }, [token]);

  // A join rejection (removed from a group, lost access to a conversation)
  // otherwise looks like an empty chat. Surface the server's reason.
  useEffect(() => {
    const handleConversationError = (payload?: { message?: string }) => {
      toast.error(
        payload?.message ?? "You no longer have access to this conversation"
      );
    };

    socket.on("conversation-error", handleConversationError);
    return () => {
      socket.off("conversation-error", handleConversationError);
    };
  }, []);

  if (!hasHydrated || !token || !user?.name) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <E2EKeyGate />
      <CallProvider>{children}</CallProvider>
    </>
  );
}
