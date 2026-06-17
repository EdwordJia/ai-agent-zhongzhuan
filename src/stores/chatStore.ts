import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  action?: {
    label: string;
    path: string;
  };
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setInput: (input: string) => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  appendAssistant: (content: string, action?: { label: string; path: string }) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [
        {
          id: generateId(),
          role: "assistant",
          content:
            "你好，我是 OpenClaw 智能体助手。你可以让我帮你创建商品、生成文案、处理图片或导出资料包。",
          timestamp: Date.now(),
        },
      ],
      input: "",
      isLoading: false,

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
      setInput: (input) => set({ input }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            { ...message, id: generateId(), timestamp: Date.now() },
          ],
        })),

      appendAssistant: (content, action) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateId(),
              role: "assistant",
              content,
              timestamp: Date.now(),
              action,
            },
          ],
          isLoading: false,
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () =>
        set({
          messages: [
            {
              id: generateId(),
              role: "assistant",
              content:
                "会话已清空。我是 OpenClaw 智能体助手，有什么可以帮你的？",
              timestamp: Date.now(),
            },
          ],
        }),
    }),
    {
      name: "openclaw-chat-storage",
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
