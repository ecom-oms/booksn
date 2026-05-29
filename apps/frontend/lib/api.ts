"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export type ApiResult<T> = Promise<T>;

export async function api<T>(path: string, options: RequestInit = {}): ApiResult<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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
  const response = await fetch(exportUrl(path, params));
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
