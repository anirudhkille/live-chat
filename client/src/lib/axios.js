import axios from "axios";

import useAuthStore from "@/store/userStore";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing= false;
let failedQueue = [];

const processQueue = (token) => {
  failedQueue.forEach((prom) => {
    prom.resolve(token);
  });
  failedQueue = [];
};

const subscribeTokenRefresh = (
  resolve,
  reject
) => {
  failedQueue.push({ resolve, reject });
};

api.interceptors.request.use(
  (config) => {
    const authState = useAuthStore.getState();
    const token = authState.token;

    if (token) {
      if (!config.url?.includes("/refresh")) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { status } = error.response || {};
    const authStore = useAuthStore.getState();

    if ((status === 401 || status === 403) && authStore.token) {
      if (originalRequest.url?.includes("/refresh")) {
        authStore.logout();
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (token) => {
            resolve(
              api({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${token}`,
                },
              })
            );
          },
          (err) => {
            reject(err);
          }
        );

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .get(`/auth/refresh`)
            .then((res) => {
              const { accessToken: newAccessToken } = res.data.data;

              authStore.setUser({
                token: newAccessToken,
              });

              processQueue(newAccessToken);

              return api({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newAccessToken}`,
                },
              });
            })
            .catch((err) => {
              authStore.logout();
              failedQueue.forEach((prom) => prom.reject(err));
              failedQueue = [];
              return Promise.reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
      }) ;
    }

    return Promise.reject(error);
  }
);

export {api};