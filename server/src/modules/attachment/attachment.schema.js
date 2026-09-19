import { z } from "zod";
import {
  contentTypeSchema,
  fileNameSchema,
  fileSizeSchema,
  keySchema,
} from "../../utils/schemas.js";

export const attachmentUrlSchema = z.object({
  contentType: contentTypeSchema,
  fileName: fileNameSchema,
  fileSize: fileSizeSchema,
});

export const attachmentConfirmSchema = z.object({
  key: keySchema,
  contentType: contentTypeSchema,
  fileName: fileNameSchema,
  fileSize: fileSizeSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.string().optional(),
});
