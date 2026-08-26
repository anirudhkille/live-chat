"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Spinner } from "@/components/ui/spinner"
import { normalizeUser } from "@/types/api"
import { useAuthStore } from "@/store/auth-store"

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore((state) => state.setSession)

  useEffect(() => {
    const accessToken = searchParams.get("accessToken")
    const userParam = searchParams.get("user")

    if (!accessToken || !userParam) {
      router.replace("/login?error=google_auth_failed")
      return
    }

    try {
      const user = normalizeUser(JSON.parse(decodeURIComponent(userParam)))

      if (!user) {
        router.replace("/login?error=google_auth_failed")
        return
      }

      setSession({ token: accessToken, user })
      router.replace(user.name ? "/chats" : "/complete-profile")
    } catch {
      router.replace("/login?error=google_auth_failed")
    }
  }, [router, searchParams, setSession])

  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
