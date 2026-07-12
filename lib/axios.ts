import axios from "axios";

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error?.response?.data?.error ?? error?.message ?? "Request failed";
    return Promise.reject(new Error(message));
  }
);
