import { useMutation } from "@tanstack/react-query"

import { verifyLoginOtp } from "../api/auth-api"

export function useVerifyLoginOtp() {
  return useMutation({
    mutationFn: verifyLoginOtp,
  })
}
