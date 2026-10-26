import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

type RetryableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let refreshRequest: Promise<void> | undefined;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;
    const url = request?.url ?? "";
    const isAuthRequest =
      url.includes("/users/login") ||
      url.includes("/users/register") ||
      url.includes("/users/refresh") ||
      url.includes("/users/logout");

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retried ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    request._retried = true;
    try {
      refreshRequest ??= axios
        .get(`${API_BASE_URL}/users/refresh`, { withCredentials: true })
        .then(() => undefined)
        .finally(() => {
          refreshRequest = undefined;
        });
      await refreshRequest;
      return api(request);
    } catch (refreshError) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("fieldnotes:session-expired"));
      }
      return Promise.reject(refreshError);
    }
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }

  const detail: unknown = error.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item: unknown) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "msg" in item &&
        typeof item.msg === "string"
      ) {
        return [item.msg.replace(/^Value error,\s*/, "")];
      }
      return [];
    });
    if (messages.length) {
      return messages.join(" ");
    }
  }
  if (!error.response) {
    return "Could not connect to the blog service. Check your connection and try again.";
  }
  return `The request failed (${error.response.status}). Please try again.`;
}

export function getAssetUrl(path: string): string;
export function getAssetUrl(path: string | null | undefined): string | undefined;
export function getAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
