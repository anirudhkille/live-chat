import { z } from "zod";

export const createConversationSchema = z.object({
  userId: z.string().cuid("Invalid user id"),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100, "Group name is too long"),
  participantIds: z
    .array(z.string().cuid("Invalid user id"))
    .min(2, "Select at least 2 members"),
});

export const addGroupParticipantsSchema = z.object({
  participantIds: z
    .array(z.string().cuid("Invalid user id"))
    .min(1, "Select at least one member"),
});
