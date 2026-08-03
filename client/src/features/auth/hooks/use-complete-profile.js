import { useMutation } from "@tanstack/react-query"
import { completeProfile } from "../api/auth-api"

export const useCompleteProfile = () => {
  return useMutation({
    mutationFn: completeProfile,
  })
}
