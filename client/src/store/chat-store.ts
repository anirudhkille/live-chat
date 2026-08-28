import { create } from "zustand";

type ConversationDraft = {
  [conversationId: string]: string;
};

type ChatState = {
  activeConversationId: string | null;
  typingUserIds: Map<string, number>;
  drafts: ConversationDraft;
  setActiveConversation: (id: string | null) => void;
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  clearAll: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  typingUserIds: new Map(),
  drafts: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const next = new Map(state.typingUserIds);
      if (isTyping) {
        next.set(`${conversationId}:${userId}`, Date.now());
      } else {
        next.delete(`${conversationId}:${userId}`);
      }
      return { typingUserIds: next };
    }),

  setDraft: (conversationId, text) =>
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: text } })),

  clearDraft: (conversationId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[conversationId];
      return { drafts: next };
    }),

  clearAll: () =>
    set({ activeConversationId: null, typingUserIds: new Map(), drafts: {} }),
}));
