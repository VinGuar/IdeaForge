import type { ForgeThread } from "./types";

const KEY = "ideaforge_threads_v1";

export function loadThreads(): ForgeThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ForgeThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ForgeThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(threads));
}
