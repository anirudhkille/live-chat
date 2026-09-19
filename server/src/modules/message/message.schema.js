import { z } from "zod";
import { cuidSchema } from "../../utils/schemas.js";

export const updateMessageSchema = z.object({
  content: z.string().min(1, "Content can't be empty"),
});

export const sendMessageSchema = z
  .object({
    content: z.string().max(4000, "Message is too long").optional(),
    cipherMeta: z.record(z.unknown()).optional(),
    attachmentIds: z.array(cuidSchema).optional(),
    replyToId: cuidSchema.optional(),
  })
  .refine(
    (data) =>
      (data.content?.trim().length ?? 0) > 0 ||
      (data.attachmentIds?.length ?? 0) > 0,
    { message: "Message content or attachments are required" },
  );

export const toggleReactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1, "Emoji is required")
    .max(16, "Emoji is too long"),
});
