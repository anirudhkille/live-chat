import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().min(1, "Email can't be empty").email("Invalid email"),
});
