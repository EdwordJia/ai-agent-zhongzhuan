export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  price: number;
  cost: number;
  currency: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  material: string;
  origin: string;
  tags: string[];
  status: "draft" | "active" | "archived";
  images: MaterialImage[];
  createdAt: number;
  updatedAt: number;
}

export interface MaterialImage {
  id: string;
  productId: string;
  type: "carousel" | "detail" | "video" | "certificate" | "thumbnail";
  fileName: string;
  filePath: string;
  fileSize: number;
  width: number;
  height: number;
  format: "jpg" | "png" | "webp" | "gif";
  sortOrder: number;
  createdAt: number;
}

export interface ExportTask {
  id: string;
  name: string;
  productIds: string[];
  template: "1688" | "alibaba" | "shopify" | "custom";
  status: "pending" | "processing" | "completed" | "failed";
  outputPath?: string;
  progress: number;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AIJob {
  id: string;
  type: "title" | "description" | "image" | "video" | "marketing" | "imagePrompt";
  productId: string;
  prompt: string;
  result?: string;
  status: "pending" | "processing" | "completed" | "failed";
  model?: string;
  createdAt: number;
  completedAt?: number;
}

export interface AIConfig {
  provider: "openai" | "deepseek" | "ollama";
  apiKey: string;
  apiBase: string;
  model: string;
  temperature: number;
}

export interface ProductFilter {
  keyword: string;
  category: string;
  status: Product["status"] | "all";
}

// ========== 图片批量处理类型 ==========

export type ImageFormat = "jpg" | "jpeg" | "png" | "webp";

export type ImageProcessOperation = "compress" | "convert" | "resize" | "rename";

export interface ImageItem {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  format: string;
  thumbnailUrl: string;
  selected: boolean;
}

export interface ImageProcessTask {
  id: string;
  imageId: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  errorMessage?: string;
  outputPath?: string;
  outputSize?: number;
}

export interface ImageProcessSettings {
  outputDir: string;
  operations: ImageProcessOperation[];
  targetFormat: ImageFormat;
  quality: number;
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio: boolean;
  renamePattern?: string;
}

export interface ImageProcessState {
  images: ImageItem[];
  tasks: ImageProcessTask[];
  settings: ImageProcessSettings;
  isProcessing: boolean;
  currentTaskId: string | null;
}

