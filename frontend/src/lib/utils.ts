import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a byte count into a human-readable string, e.g. "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/** Format a duration in seconds to a compact string, e.g. "1.45s". */
export function formatTime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  if (seconds < 0.001) return "<1ms";
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  return `${seconds.toFixed(2)}s`;
}

/** Truncate a hash string for display, e.g. "sha256:abc1…ef99". */
export function truncateHash(hash: string, chars = 8): string {
  const prefix = hash.startsWith("sha256:") ? "sha256:" : "";
  const hex = hash.slice(prefix.length);
  return `${prefix}${hex.slice(0, chars)}…${hex.slice(-4)}`;
}
