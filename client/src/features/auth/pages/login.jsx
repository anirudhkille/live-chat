import { useSearchParams } from "react-router-dom"
import AuthLayout from "../layout/auth-layout";
import { LoginForm } from "../components/login-form";
import { GoogleLogin } from "../components/google-login";

export default function Login() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get("error")

  return (
    <AuthLayout title="Welcome" description="Enter your email to continue">
      {error === "google_auth_failed" && (
        <p className="text-sm text-destructive text-center">
          Google login failed. Please try again.
        </p>
      )}

      <LoginForm />

      <div className="flex items-center gap-3">
        <hr className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <hr className="flex-1" />
      </div>

      <GoogleLogin />
    </AuthLayout>
  );
}
