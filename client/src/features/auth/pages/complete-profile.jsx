import { useNavigate } from "react-router-dom"
import { Camera } from "lucide-react"
import useAuthStore from "@/store/userStore"
import AuthLayout from "../layout/auth-layout"
import { CompleteProfileForm } from "../components/complete-profile-form"

export default function CompleteProfile() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const handleSuccess = (res) => {
    const { user: updatedUser } = res.data.data
    const token = useAuthStore.getState().token
    setUser({ token, user: updatedUser })
    navigate("/", { replace: true })
  }

  return (
    <AuthLayout
      title="Set up your profile"
      description="Last step before you start chatting"
    >
      <div className="flex justify-center">
        <button
          type="button"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <Camera className="h-6 w-6" />
        </button>
      </div>

      <CompleteProfileForm onSuccess={handleSuccess} />
    </AuthLayout>
  )
}
