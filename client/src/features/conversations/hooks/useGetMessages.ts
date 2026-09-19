import { useInfiniteQuery } from "@tanstack/react-query";
import { getMessages } from "../api/conversation-api";
import type { ApiResponse, Message } from "@/types/api";

export const MESSAGES_PAGE_SIZE = 30;

export function useGetMessages(
  conversationId: string,
  initialMessages?: Message[]
) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      getMessages(conversationId, {
        before: pageParam,
        limit: MESSAGES_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    select: (data) => data.pages.map((page) => page.data),
    initialData: initialMessages
      ? {
          pages: [
            {
              success: true,
              message: "",
              data: initialMessages,
            } as ApiResponse<Message[]>,
          ],
          pageParams: [undefined],
        }
      : undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.data || lastPage.data.length < MESSAGES_PAGE_SIZE) {
        return undefined;
      }
      const oldest = lastPage.data[lastPage.data.length - 1];
      return oldest?.createdAt;
    },
  });
}
