import { useInfiniteQuery } from "@tanstack/react-query";
import { getMessages } from "../api/conversation-api";

export const MESSAGES_PAGE_SIZE = 30;

export function useGetMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      getMessages(conversationId, {
        before: pageParam,
        limit: MESSAGES_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
    select: (data) => data.pages.map((page) => page.data),
    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.length < MESSAGES_PAGE_SIZE) {
        return undefined;
      }
      const oldest = lastPage.data[lastPage.data.length - 1];
      return oldest?.createdAt;
    },
  });
}
