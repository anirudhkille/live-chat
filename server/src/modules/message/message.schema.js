import { z } from "zod";

export const updateMessageSchema = z.object({
  content: z.string().min(1, "Content can't be empty"),
});

export const sendMessageSchema = z.object({
  content: z.string(),
  attachmentIds: z.string().optional(),
});
