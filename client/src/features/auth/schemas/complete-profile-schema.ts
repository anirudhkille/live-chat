import { z } from "zod";

export const completeProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name can't be empty")
    .min(2, "Name must be at least 2 characters"),
});

export type CompleteProfileValues = z.infer<typeof completeProfileSchema>;
