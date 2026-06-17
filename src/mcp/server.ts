import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { useProductStore } from "../stores/productStore.js";
import {
  generateContent,
  type AIGenerateType,
} from "../services/aiService.js";
import {
  generateImage,
  type ImageGenerationOptions,
} from "../services/imageGenerationService.js";
import {
  loadImagesFromFolder,
  startImageProcess,
  setImageProcessSettings,
} from "../services/imageProcessService.js";
import { createAndRunExportTask } from "../services/exportService.js";
import type { Product, MaterialImage } from "../types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function base64LengthToBytes(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

function createErrorResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ success: false, error: message }),
      },
    ],
    isError: true,
  };
}

function createSuccessResult(result: Record<string, unknown>): {
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result),
      },
    ],
  };
}

export function createOpenClawMcpServer(): McpServer {
  const server = new McpServer({
    name: "openclaw-mcp-server",
    version: "0.1.0",
  });

  // ===== 商品 CRUD =====

  server.tool(
    "list_products",
    "列出当前所有商品（返回 id、sku、name、category、price、status）",
    async () => {
    try {
      const products = useProductStore.getState().products;
      const list = products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        status: p.status,
      }));
      return createSuccessResult({ success: true, products: list });
    } catch (err) {
      return createErrorResult(err);
    }
  });

  server.tool(
    "get_product",
    "根据商品 id 获取商品完整信息",
    { id: z.string() },
    async ({ id }: { id: string }) => {
      try {
        const product = useProductStore
          .getState()
          .products.find((p) => p.id === id);
        if (!product) {
          return createErrorResult(new Error(`商品不存在: ${id}`));
        }
        return createSuccessResult({ success: true, product });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  server.tool(
    "create_product",
    "创建一个新商品，必填 sku、name、category、price",
    {
      sku: z.string(),
      name: z.string(),
      category: z.string(),
      price: z.number(),
      description: z.string().optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    },
    async (args: {
      sku: string;
      name: string;
      category: string;
      price: number;
      description?: string;
      status?: Product["status"];
    }) => {
      try {
        const product: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
          sku: args.sku,
          name: args.name,
          category: args.category,
          description: args.description || "",
          price: args.price,
          cost: 0,
          currency: "CNY",
          weight: 0,
          dimensions: { length: 0, width: 0, height: 0 },
          material: "",
          origin: "",
          tags: [],
          status: args.status || "draft",
          images: [],
        };
        await useProductStore.getState().addProduct(product);
        const newProduct = useProductStore.getState().currentProduct;
        return createSuccessResult({
          success: true,
          productId: newProduct?.id || "",
        });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  server.tool(
    "update_product",
    "更新商品信息。updatesJson 必须是一个 JSON 字符串，包含要更新的字段，例如 {\"price\": 199, \"status\": \"active\"}",
    {
      id: z.string(),
      updatesJson: z.string().describe("JSON 字符串格式的更新字段"),
    },
    async (args: { id: string; updatesJson: string }) => {
      try {
        const updates = JSON.parse(args.updatesJson) as Record<string, unknown>;
        await useProductStore.getState().updateProduct(args.id, updates);
        return createSuccessResult({ success: true });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  server.tool(
    "delete_product",
    "根据商品 id 删除商品",
    { id: z.string() },
    async ({ id }: { id: string }) => {
      try {
        await useProductStore.getState().deleteProduct(id);
        return createSuccessResult({ success: true });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  // ===== AI 文本生成 =====

  server.tool(
    "generate_text",
    "基于商品信息生成标题、描述、营销文案或生图提示词",
    {
      type: z.enum(["title", "description", "marketing", "imagePrompt"]),
      productId: z.string(),
      keywords: z.string(),
    },
    async (args: {
      type: "title" | "description" | "marketing" | "imagePrompt";
      productId: string;
      keywords: string;
    }) => {
      try {
        const product = useProductStore
          .getState()
          .products.find((p) => p.id === args.productId);
        if (!product) {
          return createErrorResult(
            new Error(`商品不存在: ${args.productId}`)
          );
        }
        const content = await generateContent(
          args.type as AIGenerateType,
          product,
          args.keywords
        );
        return createSuccessResult({ success: true, content });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  // ===== AI 生图 =====

  server.tool(
    "generate_image",
    "调用 GPT Image2 根据提示词生成商品图片，可关联到指定商品",
    {
      prompt: z.string(),
      size: z
        .enum(["1024x1024", "1024x1536", "1536x1024", "auto"])
        .optional(),
      quality: z.enum(["auto", "low", "medium", "high"]).optional(),
      outputFormat: z.enum(["png", "jpeg", "webp"]).optional(),
      background: z.enum(["auto", "opaque", "transparent"]).optional(),
      productId: z.string().optional(),
    },
    async (args: {
      prompt: string;
      size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
      quality?: "auto" | "low" | "medium" | "high";
      outputFormat?: "png" | "jpeg" | "webp";
      background?: "auto" | "opaque" | "transparent";
      productId?: string;
    }) => {
      try {
        const options: ImageGenerationOptions = {
          prompt: args.prompt,
          size: args.size,
          quality: args.quality,
          outputFormat: args.outputFormat,
          background: args.background,
          productId: args.productId,
        };
        const result = await generateImage(options);

        if (result.success && args.productId) {
          const product = useProductStore
            .getState()
            .products.find((p) => p.id === args.productId);
          if (product) {
            const imageId = generateId();
            const materialImage: MaterialImage = {
              id: imageId,
              productId: args.productId,
              type: "carousel",
              fileName: `${imageId}.png`,
              filePath: result.imageUrl,
              fileSize: result.imageUrl.startsWith("data:")
                ? base64LengthToBytes(result.imageUrl.split(",")[1] || "")
                : 0,
              width: 1024,
              height: 1024,
              format: (args.outputFormat || "png") as "jpg" | "png" | "webp" | "gif",
              sortOrder: product.images.length,
              createdAt: Date.now(),
            };
            const updatedImages = [...product.images, materialImage];
            await useProductStore
              .getState()
              .updateProduct(args.productId, { images: updatedImages });
          }
        }

        return createSuccessResult({
          success: result.success,
          imageUrl: result.imageUrl,
          model: result.model,
          revisedPrompt: result.revisedPrompt || "",
        });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  // ===== 图片批量处理 =====

  server.tool(
    "process_images",
    "批量处理指定文件夹内的图片：压缩、格式转换、尺寸调整、重命名",
    {
      folderPath: z.string(),
      outputDir: z.string(),
      operations: z
        .array(z.enum(["compress", "convert", "resize", "rename"]))
        .optional(),
      targetFormat: z.enum(["jpg", "jpeg", "png", "webp"]).optional(),
      quality: z.number().optional(),
      targetWidth: z.number().optional(),
      targetHeight: z.number().optional(),
      maintainAspectRatio: z.boolean().optional(),
      renamePattern: z.string().optional(),
    },
    async (args: {
      folderPath: string;
      outputDir: string;
      operations?: ("compress" | "convert" | "resize" | "rename")[];
      targetFormat?: "jpg" | "jpeg" | "png" | "webp";
      quality?: number;
      targetWidth?: number;
      targetHeight?: number;
      maintainAspectRatio?: boolean;
      renamePattern?: string;
    }) => {
      try {
        setImageProcessSettings({
          outputDir: args.outputDir,
          operations: args.operations || ["compress"],
          targetFormat: args.targetFormat || "jpg",
          quality: args.quality ?? 85,
          targetWidth: args.targetWidth,
          targetHeight: args.targetHeight,
          maintainAspectRatio: args.maintainAspectRatio ?? true,
          renamePattern: args.renamePattern,
        });

        await loadImagesFromFolder(args.folderPath);
        const result = await startImageProcess();

        return createSuccessResult({
          success: true,
          total: result.total,
          completed: result.completed,
          failed: result.failed,
        });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  // ===== 导出任务 =====

  server.tool(
    "create_export_task",
    "导出指定商品资料包为 zip，支持 1688、阿里国际站、Shopify、自定义模板",
    {
      name: z.string(),
      template: z.enum(["1688", "alibaba", "shopify", "custom"]),
      productIds: z.array(z.string()),
      outputDir: z.string().optional(),
    },
    async (args: {
      name: string;
      template: "1688" | "alibaba" | "shopify" | "custom";
      productIds: string[];
      outputDir?: string;
    }) => {
      try {
        const result = await createAndRunExportTask(
          args.name,
          args.template,
          args.productIds,
          args.outputDir
        );
        return createSuccessResult({
          success: result.success,
          taskId: result.taskId,
          zipPath: result.zipPath,
          productCount: result.productCount,
          imageCount: result.imageCount,
          videoCount: result.videoCount,
          error: result.error || undefined,
        });
      } catch (err) {
        return createErrorResult(err);
      }
    }
  );

  return server;
}
