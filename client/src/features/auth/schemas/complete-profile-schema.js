import { z } from "zod"

export const completeProfileSchema = z.object({
  name: z.string().min(1, "Name can't be empty").min(2, "Name must be at least 2 characters"),
})
