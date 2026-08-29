import { z } from "zod";

export const avatarUrlSchema = z.object({
  contentType: z.string().min(1, "Content type can't be empty"),
});

export const avatarConfirmSchema = z.object({
  key: z.string().min(1, "Key can't be empty"),
  contentType: z.string().min(1, "Content type can't be empty"),
  fileName: z.string().min(1, "File name can't be empty"),
  fileSize: z.number().min(1, "File size can't be empty"),
  width: z.number(),
  height: z.number(),
  duration: z.string(),
});
