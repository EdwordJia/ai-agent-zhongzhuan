import { create } from "zustand";
import type {
  ImageItem,
  ImageProcessTask,
  ImageProcessSettings,
  ImageProcessOperation,
  ImageFormat,
} from "../types";

interface ImageProcessStoreState {
  images: ImageItem[];
  tasks: ImageProcessTask[];
  settings: ImageProcessSettings;
  isProcessing: boolean;
  currentTaskId: string | null;

  // 图片列表操作
  setImages: (images: ImageItem[]) => void;
  addImages: (images: ImageItem[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  toggleSelectImage: (id: string) => void;
  selectAllImages: (selected: boolean) => void;
  getSelectedImages: () => ImageItem[];

  // 任务操作
  addTasks: (tasks: ImageProcessTask[]) => void;
  updateTaskStatus: (
    taskId: string,
    status: ImageProcessTask["status"],
    progress?: number,
    outputPath?: string,
    outputSize?: number,
    errorMessage?: string
  ) => void;
  clearTasks: () => void;

  // 设置操作
  setSettings: (settings: Partial<ImageProcessSettings>) => void;
  setOutputDir: (dir: string) => void;
  toggleOperation: (operation: ImageProcessOperation) => void;
  setTargetFormat: (format: ImageFormat) => void;
  setQuality: (quality: number) => void;
  setTargetSize: (width?: number, height?: number) => void;
  setRenamePattern: (pattern: string) => void;

  // 处理状态
  setIsProcessing: (processing: boolean) => void;
  setCurrentTaskId: (taskId: string | null) => void;
}

const defaultSettings: ImageProcessSettings = {
  outputDir: "",
  operations: ["compress"],
  targetFormat: "jpg",
  quality: 85,
  targetWidth: undefined,
  targetHeight: undefined,
  maintainAspectRatio: true,
  renamePattern: "{name}_{index}",
};

export const useImageProcessStore = create<ImageProcessStoreState>((set, get) => ({
  images: [],
  tasks: [],
  settings: { ...defaultSettings },
  isProcessing: false,
  currentTaskId: null,

  setImages: (images) => set({ images }),

  addImages: (images) =>
    set((state) => ({
      images: [...state.images, ...images],
    })),

  removeImage: (id) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      tasks: state.tasks.filter((task) => task.imageId !== id),
    })),

  clearImages: () => set({ images: [], tasks: [] }),

  toggleSelectImage: (id) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img
      ),
    })),

  selectAllImages: (selected) =>
    set((state) => ({
      images: state.images.map((img) => ({ ...img, selected })),
    })),

  getSelectedImages: () => {
    return get().images.filter((img) => img.selected);
  },

  addTasks: (tasks) =>
    set((state) => ({
      tasks: [...state.tasks, ...tasks],
    })),

  updateTaskStatus: (taskId, status, progress, outputPath, outputSize, errorMessage) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              progress: progress !== undefined ? progress : task.progress,
              outputPath: outputPath !== undefined ? outputPath : task.outputPath,
              outputSize: outputSize !== undefined ? outputSize : task.outputSize,
              errorMessage: errorMessage !== undefined ? errorMessage : task.errorMessage,
            }
          : task
      ),
    })),

  clearTasks: () => set({ tasks: [] }),

  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),

  setOutputDir: (dir) =>
    set((state) => ({
      settings: { ...state.settings, outputDir: dir },
    })),

  toggleOperation: (operation) =>
    set((state) => {
      const ops = state.settings.operations;
      const hasOp = ops.includes(operation);
      const newOps = hasOp ? ops.filter((o) => o !== operation) : [...ops, operation];
      return { settings: { ...state.settings, operations: newOps } };
    }),

  setTargetFormat: (format) =>
    set((state) => ({
      settings: { ...state.settings, targetFormat: format },
    })),

  setQuality: (quality) =>
    set((state) => ({
      settings: { ...state.settings, quality },
    })),

  setTargetSize: (width, height) =>
    set((state) => ({
      settings: { ...state.settings, targetWidth: width, targetHeight: height },
    })),

  setRenamePattern: (pattern) =>
    set((state) => ({
      settings: { ...state.settings, renamePattern: pattern },
    })),

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  setCurrentTaskId: (currentTaskId) => set({ currentTaskId }),
}));
