/**
 * Pure attachment claim rules. Kept free of Prisma so they can be unit tested.
 *
 * Attachments are uploaded under `attachments/<userId>/...`; the stored,
 * client-visible URL must therefore contain that prefix before a sender is
 * allowed to attach it to a message.
 */

export const attachmentOwnerPrefix = (userId) => `/attachments/${userId}/`;

export const isAttachmentOwnedBy = (attachment, userId) => {
  if (!userId || typeof attachment?.url !== "string") return false;
  return attachment.url.includes(attachmentOwnerPrefix(userId));
};

/**
 * Validate that every requested attachment can be claimed by the sender.
 *
 * @param {{
 *   attachments: { id: string, url: string, messageId?: string | null }[],
 *   attachmentIds: string[],
 *   senderId: string,
 * }} input
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
export const validateAttachmentClaim = ({
  attachments,
  attachmentIds,
  senderId,
}) => {
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
    return { ok: true };
  }

  const uniqueIds = new Set(attachmentIds);
  if (uniqueIds.size !== attachmentIds.length) {
    return {
      ok: false,
      status: 400,
      message: "Duplicate attachment ids are not allowed",
    };
  }

  const found = new Map(
    (attachments ?? []).map((attachment) => [attachment.id, attachment]),
  );

  for (const id of uniqueIds) {
    const attachment = found.get(id);
    if (!attachment) {
      return {
        ok: false,
        status: 400,
        message: "One or more attachments were not found",
      };
    }
    if (attachment.messageId != null) {
      return {
        ok: false,
        status: 400,
        message: "One or more attachments are already in use",
      };
    }
    if (!isAttachmentOwnedBy(attachment, senderId)) {
      return {
        ok: false,
        status: 403,
        message: "One or more attachments do not belong to you",
      };
    }
  }

  return { ok: true };
};
