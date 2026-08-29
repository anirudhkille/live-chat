import { z } from "zod";

export const createConversationSchema = z.object({
  userId: z.string().cuid("Invalid user id"),
});
