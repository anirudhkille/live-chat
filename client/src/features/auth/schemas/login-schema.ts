import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email can't be empty")
    .pipe(z.email("Enter a valid email")),
});

export type LoginValues = z.infer<typeof loginSchema>;
