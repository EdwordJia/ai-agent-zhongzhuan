import type { Product } from "../types";
import { post } from "../services/apiService";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
export type ImageQuality = "auto" | "low" | "medium" | "high";
export type ImageOutputFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "opaque" | "transparent";

export interface ImageGenerationOptions {
  prompt: string;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  outputFormat?: ImageOutputFormat;
  background?: ImageBackground;
  productId?: string;
  productName?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl: string;
  model: string;
  revisedPrompt?: string;
  usage?: unknown;
}

interface BackendGenerateResponse {
  images: Array<{
    url: string;
    revisedPrompt?: string;
  }>;
  pointsRemaining: number;
}

/**
 * 批量生成图片 - 调用后端代理服务
 */
export async function generateImages(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult[]> {
  if (!options.prompt.trim()) {
    throw new Error("请输入生图提示词");
  }

  const total = Math.max(1, Math.min(options.n || 1, 8));

  const response = await post<BackendGenerateResponse>("/images/generate", {
    prompt: options.prompt.trim(),
    n: total,
    size: options.size || "1024x1024",
    quality: options.quality || "auto",
    outputFormat: options.outputFormat || "png",
    background: options.background || "auto",
  });

  if (!response.images || response.images.length === 0) {
    throw new Error("后端未返回图片数据");
  }

  return response.images.map((item) => ({
    success: true,
    imageUrl: item.url,
    model: "gpt-image-2",
    revisedPrompt: item.revisedPrompt,
  }));
}

/** 生成单张图片的便捷封装 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const results = await generateImages({ ...options, n: 1 });
  return results[0];
}

/** 基于商品自动生成商品摄影提示词 */
export async function generateProductImagePrompt(
  product: Product,
  keywords: string
): Promise<string> {
  const keyword = keywords.split(/[,，\s]+/)[0] || keywords;
  return `Product photography of ${product.name}, ${keyword} theme, clean white background, professional studio lighting, 8k ultra detailed, commercial advertisement style, centered composition, soft shadows, premium feel`;
}
