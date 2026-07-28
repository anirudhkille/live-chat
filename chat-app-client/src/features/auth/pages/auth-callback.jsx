import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import useAuthStore from "@/store/userStore"
import { Spinner } from "@/components/ui/spinner"

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const accessToken = searchParams.get("accessToken")
    const userParam = searchParams.get("user")

    if (!accessToken || !userParam) {
      navigate("/login?error=google_auth_failed", { replace: true })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam))
      setUser({ token: accessToken, user })

      if (user.name) {
        navigate("/", { replace: true })
      } else {
        navigate("/complete-profile", { replace: true })
      }
    } catch {
      navigate("/login?error=google_auth_failed", { replace: true })
    }
  }, [searchParams, navigate, setUser])

  return (
    <div className="flex h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}
