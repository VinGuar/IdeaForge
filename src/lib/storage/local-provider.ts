import type { ForgeThread } from "@/lib/workspace/types";
import type { StorageProvider, StoredMessage } from "./types";

const THREADS_KEY = "ideaforge_threads_v1";
const MESSAGES_KEY = (id: string) => `ideaforge_messages_v1_${id}`;

function readThreads(): ForgeThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ForgeThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeThreads(threads: ForgeThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export const localProvider: StorageProvider = {
  async loadThreads() {
    return readThreads();
  },

  async upsertThread(thread) {
    const threads = readThreads();
    const idx = threads.findIndex((t) => t.id === thread.id);
    if (idx === -1) {
      writeThreads([thread, ...threads]);
    } else {
      threads[idx] = thread;
      writeThreads(threads);
    }
  },

  async deleteThread(id) {
    writeThreads(readThreads().filter((t) => t.id !== id));
    if (typeof window !== "undefined") {
      localStorage.removeItem(MESSAGES_KEY(id));
    }
  },

  async loadMessages(threadId) {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(MESSAGES_KEY(threadId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as StoredMessage[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async saveMessages(threadId, messages) {
    if (typeof window === "undefined") return;
    localStorage.setItem(MESSAGES_KEY(threadId), JSON.stringify(messages));
  },
};
