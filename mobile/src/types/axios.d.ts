import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Internal flag used to prevent refresh loops on auth endpoints. */
    skipAuthRefresh?: boolean;
  }
}
