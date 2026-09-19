import { z } from "zod";
import { contentTypeSchema, cuidSchema } from "../../utils/schemas.js";

export const createConversationSchema = z.object({
  userId: cuidSchema,
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Group name is required")
    .max(100, "Group name is too long"),
  participantIds: z.array(cuidSchema).min(2, "Select at least 2 members"),
  photoKey: z.string().optional(),
});

export const addGroupParticipantsSchema = z.object({
  participantIds: z.array(cuidSchema).min(1, "Select at least one member"),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  photoKey: z.string().optional(),
});

export const groupPhotoUrlSchema = z.object({
  contentType: contentTypeSchema,
});
