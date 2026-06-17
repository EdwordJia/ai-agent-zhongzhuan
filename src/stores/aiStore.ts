import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIResult } from "../services/aiService";

interface AIHistoryState {
  history: AIResult[];
  addHistory: (item: AIResult) => void;
  deleteHistory: (createdAt: number) => void;
  clearHistory: () => void;
}

export const useAIHistoryStore = create<AIHistoryState>()(
  persist(
    (set) => ({
      history: [],

      addHistory: (item) => {
        set((state) => ({
          history: [item, ...state.history].slice(0, 50), // 最多保留 50 条
        }));
      },

      deleteHistory: (createdAt) => {
        set((state) => ({
          history: state.history.filter((h) => h.createdAt !== createdAt),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: "ai-history-storage", // localStorage key
      // 注意：当前使用浏览器 localStorage，Tauri 持久化可后续迁移到 tauri-plugin-store
    }
  )
);
