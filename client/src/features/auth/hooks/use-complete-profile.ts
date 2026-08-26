import { useMutation } from "@tanstack/react-query"

import type { CompleteProfileValues } from "../schemas/complete-profile-schema"
import { updateProfile } from "../api/auth-api"

export function useCompleteProfile() {
  return useMutation({
    mutationFn: (values: CompleteProfileValues) => updateProfile(values),
  })
}
