"use client"

import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"

import { logoutRequest } from "@/features/auth/api/auth-api"
import { useAuthStore } from "@/store/auth-store"

export function useLogout() {
  const router = useRouter()
  const clearSession = useAuthStore((state) => state.clearSession)

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      // Clear local session even if the server call fails.
      clearSession()
      router.replace("/login")
    },
  })
}
