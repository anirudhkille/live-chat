export type User = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
};

export type GroupParticipant = {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string;
};

export type Conversation = {
  id: string;
  isGroup: boolean;
  name: string | null;
  photoUrl: string | null;
  email: string | null;
  otherUserId: string | null;
  unreadCount: number;
  participants: GroupParticipant[];
  lastMessage: Message | null;
  createdAt: string;
};

export type MessageReaction = {
  id: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
  };
};

export type ReplyTo = {
  id: string;
  senderId: string;
  senderName: string | null;
  content: string | null;
  deleted: boolean;
};

export type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  sender?: User;
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  replyTo?: ReplyTo | null;
};

export type Attachment = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  duration: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type MessagePage = {
  messages: Message[];
  nextCursor: string | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export function normalizeUser(raw: unknown): User | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const id = record.id ?? record._id;
  if (typeof id !== "string") return null;
  const email = typeof record.email === "string" ? record.email : "";
  const name =
    typeof record.name === "string" && record.name ? record.name : null;
  const avatar =
    typeof record.avatar === "string" && record.avatar ? record.avatar : null;
  return { id, name, email, avatar };
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong"
): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}
