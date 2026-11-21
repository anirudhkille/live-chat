/**
 * Decide how a group leave request affects the remaining participants.
 * Pure helper so the rules can be tested without Prisma or Redis.
 *
 * @param {{ userId: string, role?: string }[]} participants
 * @param {string} userId
 * @returns {{
 *   allowed: boolean,
 *   deleted: boolean,
 *   promoteUserId: string | null,
 * }}
 */
export const planLeaveGroup = (participants, userId) => {
  const leaver = participants.find(
    (participant) => participant.userId === userId,
  );
  if (!leaver) {
    return { allowed: false, deleted: false, promoteUserId: null };
  }

  const remaining = participants.filter(
    (participant) => participant.userId !== userId,
  );

  if (remaining.length === 0) {
    return { allowed: true, deleted: true, promoteUserId: null };
  }

  const needsPromotion =
    leaver.role === "admin" &&
    !remaining.some((participant) => participant.role === "admin");

  return {
    allowed: true,
    deleted: false,
    promoteUserId: needsPromotion ? remaining[0].userId : null,
  };
};
