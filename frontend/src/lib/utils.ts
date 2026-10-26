import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(timestampMs: number): string {
  if (!timestampMs || timestampMs <= 0) return "Never";
  const seconds = Math.floor((Date.now() - timestampMs) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

export function getFreshnessBadge(freshnessScore: number) {
  if (freshnessScore >= 0.8) {
    return { label: "Fresh", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
  } else if (freshnessScore >= 0.4) {
    return { label: "Aging", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" };
  } else {
    return { label: "Stale", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
  }
}
