import { z } from "zod";
import {
  contentTypeSchema,
  hexColorSchema,
  keySchema,
} from "../../utils/schemas.js";

export const avatarUrlSchema = z.object({
  contentType: contentTypeSchema,
});

export const avatarConfirmSchema = z.object({
  key: keySchema,
});

export const wallpaperUrlSchema = z.object({
  contentType: contentTypeSchema,
});

export const wallpaperConfirmSchema = z.object({
  key: keySchema,
});

export const updatePreferencesSchema = z.object({
  showOnline: z.boolean().optional(),
  readReceipts: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
  phoneVisible: z.boolean().optional(),
  typingIndicators: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  chatWallpaperUrl: z.string().nullable().optional(),
  chatWallpaperColor: hexColorSchema.nullable().optional(),
});
