import { z } from "zod";
import { cuidSchema } from "../../utils/schemas.js";

const CIPHER_META_MAX_BYTES = 4096;
const CIPHER_META_MAX_KEYS = 32;

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const cipherMetaSchema = z
  .record(z.string(), z.unknown())
  .refine(isPlainObject, { message: "cipherMeta must be an object" })
  .refine((value) => Object.keys(value).length <= CIPHER_META_MAX_KEYS, {
    message: "cipherMeta has too many fields",
  })
  .refine(
    (value) => {
      try {
        return JSON.stringify(value).length <= CIPHER_META_MAX_BYTES;
      } catch {
        return false;
      }
    },
    { message: "cipherMeta is too large" },
  );

export const updateMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Content can't be empty")
    .max(4000, "Message is too long"),
  cipherMeta: cipherMetaSchema.optional(),
});

export const sendMessageSchema = z
  .object({
    content: z.string().max(4000, "Message is too long").optional(),
    cipherMeta: cipherMetaSchema.optional(),
    attachmentIds: z
      .array(cuidSchema)
      .max(10, "At most 10 attachments are allowed")
      .optional(),
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
