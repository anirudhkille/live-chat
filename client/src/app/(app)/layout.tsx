import type { Metadata } from "next";

import { ProtectedRoute } from "@/components/auth/protected-route";

export const metadata: Metadata = { title: "Chats" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
