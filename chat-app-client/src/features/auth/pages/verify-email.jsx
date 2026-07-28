import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import AuthLayout from "../layout/auth-layout"
import { VerifyEmailForm } from "../components/verify-email-form"
import { useSendLoginOtp } from "../hooks/use-login"
import useAuthStore from "@/store/userStore"

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email
  const setUser = useAuthStore((s) => s.setUser)

  const { mutate: resendOtp } = useSendLoginOtp()

  useEffect(() => {
    if (!email) navigate("/login", { replace: true })
  }, [email, navigate])

  const handleSuccess = (res) => {
    const { user, accessToken } = res.data.data
    setUser({ token: accessToken, user })

    if (user.name) {
      navigate("/", { replace: true })
    } else {
      navigate("/complete-profile", { replace: true })
    }
  }

  const handleResend = () => {
    resendOtp({ email })
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={`Code sent to ${email}`}
    >
      <VerifyEmailForm
        email={email}
        onSuccess={handleSuccess}
        onResend={handleResend}
      />
    </AuthLayout>
  )
}
