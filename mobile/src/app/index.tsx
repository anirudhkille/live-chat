import { Redirect } from "expo-router";

import { useAuthStore } from "@/store/auth-store";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hasHydrated);

  if (!hydrated) return null;
  return <Redirect href={token ? "/(tabs)" : "/(auth)/login"} />;
}