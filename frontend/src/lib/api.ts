/**
 * Thin fetch wrappers for every backend endpoint.
 *
 * All functions throw on non-2xx responses so callers (hooks) can catch
 * and surface errors via the ScanContext error field + Sonner toasts.
 */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export interface StartScanBody {
  path: string;
  chunk_size?: number;
  use_partial_hash?: boolean;
}

export const startScan = (body: StartScanBody) =>
  request<{ status: string }>("POST", "/scan/start", body);

export const cancelScan = () =>
  request<{ status: string }>("POST", "/scan/cancel");

export const getResults = () => request<unknown>("GET", "/results");

export const clearResults = () =>
  request<{ status: string }>("DELETE", "/results");
