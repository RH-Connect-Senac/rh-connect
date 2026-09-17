import axios from "axios";

const DEFAULT_API_BASE = "/rhconnect/api";
const fromEnv = (import.meta.env?.VITE_API_URL as string | undefined)?.trim();

export const API_BASE_URL = (fromEnv || DEFAULT_API_BASE).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const message = (error.response.data as { message?: unknown } | undefined)?.message;
      if (typeof message === "string") {
        error.message = message;
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return fallback;
}