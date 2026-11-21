import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/auth-store";

import { API_BASE_URL } from "./env";
import { clearSessionState } from "./session-cleanup";
import { setSocketAuthToken, setSocketTokenRefresher } from "./socket";

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

type RefreshPayload = {
  accessToken?: string;
  refreshToken?: string;
};

let refreshPromise: Promise<string> | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

function unwrapRefreshPayload(data: unknown): RefreshPayload | null {
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const accessToken =
    typeof nested.accessToken === "string" ? nested.accessToken : undefined;
  const refreshToken =
    typeof nested.refreshToken === "string" ? nested.refreshToken : undefined;

  return accessToken ? { accessToken, refreshToken } : null;
}

function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

/**
 * Single-flight refresh shared by the HTTP interceptor and the socket layer.
 * Only an explicit 401/403 from the refresh endpoint ends the session; network
 * failures and 5xx responses are surfaced to callers so a transient outage does
 * not sign the user out.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      clearSessionState();
      throw new Error("Session expired. Please sign in again.");
    }

    try {
      const response = await api.post(
        "/auth/refresh",
        { refreshToken },
        {
          headers: { "X-Client": "mobile" },
          skipAuthRefresh: true,
        },
      );
      const payload = unwrapRefreshPayload(response.data);

      if (!payload?.accessToken) {
        throw new Error("Refresh response did not include an access token.");
      }

      useAuthStore.getState().setSession({
        token: payload.accessToken,
        refreshToken: payload.refreshToken,
      });
      setSocketAuthToken(payload.accessToken);

      return payload.accessToken;
    } catch (error) {
      if (isAuthError(error)) {
        clearSessionState();
      }
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

setSocketTokenRefresher(async () => {
  try {
    return await refreshAccessToken();
  } catch {
    return null;
  }
});

api.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    return Promise.reject(new Error("EXPO_PUBLIC_API_URL is not set."));
  }

  const token = useAuthStore.getState().token;
  const skipsAuth =
    config.url?.includes("/auth/refresh") ||
    config.url?.includes("/auth/logout");

  if (token && !skipsAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const authStore = useAuthStore.getState();
    const skipsAuthRefresh =
      originalRequest?.skipAuthRefresh ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    if (
      status === 401 &&
      authStore.token &&
      originalRequest &&
      !originalRequest._retry &&
      !skipsAuthRefresh
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
