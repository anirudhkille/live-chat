import { useMutation } from "@tanstack/react-query"
import { verifyLoginOtp } from "../api/auth-api"

export const useVerifyLoginOtp = () => {
  return useMutation({
    mutationFn: verifyLoginOtp,
  })
}
