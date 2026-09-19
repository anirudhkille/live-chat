import { create } from "zustand";

type ConversationDraft = {
  [conversationId: string]: string;
};

export type ReplyTarget = {
  messageId: string;
  senderName: string | null;
  content: string | null;
  deleted: boolean;
  preview?: string | null;
};

type ReplyState = {
  [conversationId: string]: ReplyTarget | null;
};

type ChatState = {
  drafts: ConversationDraft;
  replies: ReplyState;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setReplyTo: (conversationId: string, target: ReplyTarget | null) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  drafts: {},
  replies: {},

  setDraft: (conversationId, text) =>
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: text } })),

  clearDraft: (conversationId) =>
    set((state) => {
      const next = { ...state.drafts };
      delete next[conversationId];
      return { drafts: next };
    }),

  setReplyTo: (conversationId, target) =>
    set((state) => ({
      replies: { ...state.replies, [conversationId]: target },
    })),
}));
