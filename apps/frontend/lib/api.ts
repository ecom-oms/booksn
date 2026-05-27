"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> = Promise<T>;

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("books_inventory_token") ?? "";
}

export function setToken(token: string) {
  window.localStorage.setItem("books_inventory_token", token);
}

export function clearToken() {
  window.localStorage.removeItem("books_inventory_token");
}

export async function api<T>(path: string, options: RequestInit = {}): ApiResult<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(body.message ?? "Request failed");
  }
  return response.json();
}

export function exportUrl(path: string, params: URLSearchParams) {
  return `${API_BASE_URL}${path}?${params.toString()}`;
}

export async function downloadExport(path: string, params: URLSearchParams, filename: string) {
  const token = getToken();
  const response = await fetch(exportUrl(path, params), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
