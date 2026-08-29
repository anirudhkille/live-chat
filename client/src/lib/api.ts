import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/store/auth-store";

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type PendingRequest = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let pendingRequests: PendingRequest[] = [];

function processQueue(token: string | null, error?: unknown) {
  pendingRequests.forEach((request) => {
    if (token && !error) {
      request.resolve(token);
    } else {
      request.reject(error);
    }
  });
  pendingRequests = [];
}

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_API_URL is not set. Add it to client/.env.local (see .env.example)."
      )
    );
  }

  const token = useAuthStore.getState().token;

  if (token && !config.url?.includes("/auth/refresh")) {
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

    if (
      (status === 401 || status === 403) &&
      authStore.token &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (originalRequest.url?.includes("/auth/refresh")) {
        authStore.clearSession();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await api.get<{ data: { accessToken: string } }>(
          "/auth/refresh"
        );
        const newAccessToken = response.data.data.accessToken;

        authStore.setToken(newAccessToken);
        processQueue(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        authStore.clearSession();
        processQueue(null, refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export async function putPresignedObject(
  uploadUrl: string,
  blob: Blob,
  contentType: string
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
}
