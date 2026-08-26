import { useMutation } from "@tanstack/react-query"

import {
  updateProfile,
} from "@/features/auth/api/auth-api"
import type {
  CompleteProfileValues,
} from "@/features/auth/schemas/complete-profile-schema"

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (values: CompleteProfileValues) => updateProfile(values),
  })
}
