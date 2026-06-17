import type { Product } from "../types";

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
export type ImageQuality = "auto" | "low" | "medium" | "high";
export type ImageOutputFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "opaque" | "transparent";

export interface ImageGenerationConfig {
  /** GPT Image2 网关地址 */
  gatewayUrl: string;
  /** 网关 API Key */
  apiKey: string;
  /** 默认生图模型 */
  model: string;
}

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

const CONFIG_KEY = "ai-image-generation-config";
const DEFAULT_GATEWAY_URL = "https://www.fhl.mom/";
const DEFAULT_MODEL = "gpt-image-2";
/** 该网关单次请求最多生成的图片数量。fhl.mom 的 gpt-image-2 不支持 n>1，故设为 1 */
const MAX_BATCH_PER_REQUEST = 1;

const defaultConfig: ImageGenerationConfig = {
  gatewayUrl: DEFAULT_GATEWAY_URL,
  apiKey: "sk-0d78ed4934dff12aee5c01366fe4e646540e6bbdc344c90ec17c41f0ce468f40",
  model: DEFAULT_MODEL,
};

export function getImageGenerationConfig(): ImageGenerationConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch {
    // ignore parse error
  }
  return { ...defaultConfig };
}

export function saveImageGenerationConfig(config: ImageGenerationConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

interface GatewayImageItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

interface GatewayResponse {
  data?: GatewayImageItem[];
  usage?: unknown;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

function normalizeGatewayUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function mimeTypeFromFormat(format: ImageOutputFormat): string {
  switch (format) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

function imageUrlFromItem(item: GatewayImageItem, outputFormat: ImageOutputFormat): string {
  if (item.b64_json) {
    return `data:${mimeTypeFromFormat(outputFormat)};base64,${item.b64_json}`;
  }
  if (item.url) {
    return item.url;
  }
  throw new Error("网关返回的图片数据为空");
}

function buildGenerationUrl(gatewayUrl: string): string {
  const trimmed = gatewayUrl.trim();
  const path = "v1/images/generations";

  if (trimmed.startsWith("/")) {
    // 相对路径（用于 Vite dev proxy）
    const base = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    return `${window.location.origin}${base}/${path}`;
  }

  const normalized = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  return new URL(path, normalized).toString();
}

async function requestImages(
  options: Required<Pick<ImageGenerationOptions, "prompt" | "size" | "quality" | "outputFormat" | "background">> & { n: number },
  cfg: ImageGenerationConfig
): Promise<ImageGenerationResult[]> {
  const generationUrl = buildGenerationUrl(cfg.gatewayUrl || DEFAULT_GATEWAY_URL);
  const model = cfg.model || DEFAULT_MODEL;

  const response = await fetch(generationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt.trim(),
      n: options.n,
      size: options.size,
      quality: options.quality,
      background: options.background,
      output_format: options.outputFormat,
    }),
  });

  const text = await response.text();
  let data: GatewayResponse = {};
  if (text) {
    try {
      data = JSON.parse(text) as GatewayResponse;
    } catch {
      data = { error: { message: text.slice(0, 500) } };
    }
  }

  if (!response.ok) {
    const message = data.error?.message || `Image gateway error: ${response.status}`;
    throw new Error(message);
  }

  if (!data.data || data.data.length === 0) {
    throw new Error("网关未返回图片数据");
  }

  return data.data.map((item) => ({
    success: true,
    imageUrl: imageUrlFromItem(item, options.outputFormat),
    model,
    revisedPrompt: item.revised_prompt,
    usage: data.usage,
  }));
}

/**
 * 批量生成图片。
 * 由于部分网关单次请求最多返回 4 张，当 n > 4 时会自动拆分为多次请求并合并结果。
 */
export async function generateImages(
  options: ImageGenerationOptions,
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult[]> {
  const cfg = config || getImageGenerationConfig();
  if (!cfg.apiKey.trim()) {
    throw new Error("请先在设置中配置 Image Gateway API Key");
  }
  if (!options.prompt.trim()) {
    throw new Error("请输入生图提示词");
  }

  const total = Math.max(1, Math.min(options.n || 1, 8));
  const normalizedOptions = {
    prompt: options.prompt.trim(),
    size: options.size || "1024x1024",
    quality: options.quality || "auto",
    outputFormat: options.outputFormat || "png",
    background: options.background || "auto",
    n: 1,
  };

  const results: ImageGenerationResult[] = [];
  let remaining = total;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, MAX_BATCH_PER_REQUEST);
    const batch = await requestImages({ ...normalizedOptions, n: batchSize }, cfg);
    results.push(...batch);
    remaining -= batchSize;
  }

  return results;
}

/** 生成单张图片的便捷封装 */
export async function generateImage(
  options: ImageGenerationOptions,
  config?: ImageGenerationConfig
): Promise<ImageGenerationResult> {
  const results = await generateImages({ ...options, n: 1 }, config);
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
