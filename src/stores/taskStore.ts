import { create } from "zustand";
import type { ExportTask } from "../types";

interface TaskState {
  tasks: ExportTask[];

  addTask: (task: Omit<ExportTask, "id" | "createdAt" | "progress" | "status">) => ExportTask;
  updateTask: (id: string, updates: Partial<ExportTask>) => void;
  deleteTask: (id: string) => void;
  setTaskProgress: (id: string, progress: number) => void;
  setTaskStatus: (id: string, status: ExportTask["status"], errorMessage?: string) => void;
  getTaskById: (id: string) => ExportTask | undefined;
  getCompletedTasks: () => ExportTask[];
  getPendingTasks: () => ExportTask[];
  clearCompletedTasks: () => void;
}

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  addTask: (task) => {
    const newTask: ExportTask = {
      ...task,
      id: generateId(),
      status: "pending",
      progress: 0,
      createdAt: Date.now(),
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
    }));
    return newTask;
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  deleteTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  setTaskProgress: (id, progress) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, progress: Math.max(0, Math.min(100, progress)) } : t
      ),
    }));
  },

  setTaskStatus: (id, status, errorMessage) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              ...(errorMessage !== undefined && { errorMessage }),
              ...(status === "completed" && { completedAt: Date.now(), progress: 100 }),
              ...(status === "failed" && { progress: 0 }),
            }
          : t
      ),
    }));
  },

  getTaskById: (id) => {
    return get().tasks.find((t) => t.id === id);
  },

  getCompletedTasks: () => {
    return get().tasks.filter((t) => t.status === "completed");
  },

  getPendingTasks: () => {
    return get().tasks.filter((t) => t.status === "pending" || t.status === "processing");
  },

  clearCompletedTasks: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== "completed"),
    }));
  },
}));
