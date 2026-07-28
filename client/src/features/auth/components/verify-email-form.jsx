import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { verifyEmailSchema } from "../schemas/verify-email-schema"
import { useVerifyLoginOtp } from "../hooks/use-verify-email"

export function VerifyEmailForm({ email, onSuccess, onResend }) {
  const [countdown, setCountdown] = useState(30)

  const { mutate: verifyOtp, isPending, error } = useVerifyLoginOtp()

  const { control, handleSubmit, setValue } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: email || "", otp: "" },
  })

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const onSubmit = (data) => {
    verifyOtp(data, { onSuccess })
  }

  const handleResend = () => {
    if (countdown > 0) return
    onResend()
    setCountdown(30)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="otp"
          control={control}
          render={({ field }) => (
            <InputOTP
              {...field}
              maxLength={6}
              onChange={(value) => {
                field.onChange(value)
                setValue("otp", value)
                if (value.length === 6) {
                  handleSubmit(onSubmit)()
                }
              }}
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}
        />

        {error && (
          <p className="text-sm text-destructive text-center">
            {error.response?.data?.message || "Invalid OTP"}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Verifying..." : "Continue"}
        </Button>
      </form>

      <button
        type="button"
        className="w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        onClick={handleResend}
        disabled={countdown > 0}
      >
        {countdown > 0
          ? `Resend code in 0:${String(countdown).padStart(2, "0")}`
          : "Resend code"}
      </button>
    </div>
  )
}
