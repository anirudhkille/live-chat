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

export type Conversation = {
  id: string;
  name: string | null;
  photoUrl: string | null;
  email: string;
  lastMessage: Message | null;
  unreadCount: number;
  createdAt: string;
};

export type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  readAt: string | null;
  createdAt: string;
  sender?: User;
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
