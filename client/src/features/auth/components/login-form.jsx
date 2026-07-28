import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { FormField } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { loginSchema } from "../schemas/login-schema"
import { useSendLoginOtp } from "../hooks/use-login"

export function LoginForm() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useSendLoginOtp()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data) => {
    mutate(data, {
      onSuccess: () => {
        navigate("/verify-email", { state: { email: data.email } })
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        name="email"
        register={register}
        error={errors.email}
        type="email"
        placeholder="m@example.com"
      />
      {error && (
        <p className="text-sm text-destructive">{error.response?.data?.message || "Something went wrong"}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Continue"}
      </Button>
    </form>
  )
}
