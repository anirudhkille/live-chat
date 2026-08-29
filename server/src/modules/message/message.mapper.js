export const toMessageResponse = (message) => {
  const { reads, ...rest } = message;
  const readAt =
    reads?.find((read) => read.userId !== message.senderId)?.readAt ?? null;
  return { ...rest, readAt };
};
