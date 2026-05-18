import type { ForgeThread } from "@/lib/workspace/types";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

/**
 * Every storage backend implements this interface.
 * Swap Supabase for anything else by writing a new provider
 * and changing the export in index.ts — no app code changes needed.
 */
export interface StorageProvider {
  /** Load all threads for the current user, newest first. */
  loadThreads(): Promise<ForgeThread[]>;

  /** Insert or update a single thread (and its report if present). */
  upsertThread(thread: ForgeThread): Promise<void>;

  /** Permanently delete a thread and all its data. */
  deleteThread(id: string): Promise<void>;

  /** Load chat messages for a thread, oldest first. */
  loadMessages(threadId: string): Promise<StoredMessage[]>;

  /**
   * Persist the current message list for a thread.
   * Replaces any previously stored messages for that thread.
   * Callers should trim to a reasonable cap before calling.
   */
  saveMessages(threadId: string, messages: StoredMessage[]): Promise<void>;
}
