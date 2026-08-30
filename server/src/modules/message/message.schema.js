import { z } from "zod";

export const updateMessageSchema = z.object({
  content: z.string().min(1, "Content can't be empty"),
});

export const sendMessageSchema = z.object({
  content: z.string(),
  attachmentIds: z.array(z.string().cuid()).optional(),
  replyToId: z.string().cuid().optional(),
});

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1, "Emoji is required").max(16, "Emoji is too long"),
});
