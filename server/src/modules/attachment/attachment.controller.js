import { asyncHandler } from "../../utils/asyncHandler.js";
import * as attachmentService from "./attachment.service.js";
import { sendResponse } from "../../utils/response.js";

export const getAttachmentUploadUrl = asyncHandler(async (req, res) => {
  const { contentType, fileName, fileSize } = req.body;

  const result = await attachmentService.getAttachmentUploadUrl(req.user.id, {
    contentType,
    fileName,
    fileSize,
  });
  sendResponse(
    res,
    200,
    "Attachment upload url generated successfully",
    result,
  );
});

export const confirmAttachmentUpload = asyncHandler(async (req, res) => {
  const { key, contentType, fileName, fileSize, width, height, duration } =
    req.body;

  const attachment = await attachmentService.confirmAttachmentUpload(
    req.user.id,
    {
      key,
      contentType,
      fileName,
      fileSize,
      width,
      height,
      duration,
    },
  );
  sendResponse(res, 200, "Attachment saved successfully", attachment);
});
