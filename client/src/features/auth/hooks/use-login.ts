import { useMutation } from "@tanstack/react-query";

import { sendLoginOtp } from "../api/auth-api";

export function useSendLoginOtp() {
  return useMutation({
    mutationFn: (email: string) => sendLoginOtp(email),
  });
}
