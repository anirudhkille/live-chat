export interface User {
  id: string
  name: string | null
  email: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

export function normalizeUser(raw: unknown): User | null {
  if (typeof raw !== "object" || raw === null) return null
  const record = raw as Record<string, unknown>
  const id = record.id ?? record._id
  if (typeof id !== "string") return null
  const email = typeof record.email === "string" ? record.email : ""
  const name = typeof record.name === "string" && record.name ? record.name : null
  return { id, name, email }
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
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
    return error.response.data.message
  }
  return fallback
}
