import { useImageProcessStore } from "../stores/imageProcessStore";
import { invoke } from "@tauri-apps/api/core";
import {
  generateId,
  getFileNameWithoutExt,
  getFileExt,
  processImageWithCanvas,
  generateRenamedFileName,
} from "../utils/helpers";
import type { ImageItem, ImageProcessTask, ImageFormat } from "../types";

async function readFileAsUint8Array(filePath: string): Promise<Uint8Array> {
  const { readFile } = await import("@tauri-apps/plugin-fs" as any);
  return (await readFile(filePath)) as Uint8Array;
}

async function pathToThumbnailUrl(filePath: string): Promise<string> {
  try {
    const uint8Array = await readFileAsUint8Array(filePath);
    const bytes = Array.from(uint8Array);
    const binary = bytes.map((b: number) => String.fromCharCode(b)).join("");
    const base64 = btoa(binary);
    const ext = getFileExt(filePath);
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : ext === "gif"
        ? "image/gif"
        : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return "";
  }
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const uint8Array = await readFileAsUint8Array(filePath);
    return uint8Array.length;
  } catch {
    return 0;
  }
}

export interface LoadImagesResult {
  count: number;
  images: ImageItem[];
}

export async function loadImagesFromFolder(folderPath: string): Promise<LoadImagesResult> {
  const filePaths = await invoke<string[]>("read_image_dir", { path: folderPath });

  if (filePaths.length === 0) {
    return { count: 0, images: [] };
  }

  const newImages: ImageItem[] = [];
  for (const filePath of filePaths) {
    const fileName = filePath.split(/[\\/]/).pop() || "";
    const thumbnailUrl = await pathToThumbnailUrl(filePath);
    const fileSize = await getFileSize(filePath);
    const dimensions = thumbnailUrl ? await getImageDimensions(thumbnailUrl) : { width: 0, height: 0 };

    newImages.push({
      id: generateId(),
      filePath,
      fileName,
      fileSize,
      width: dimensions.width,
      height: dimensions.height,
      format: getFileExt(filePath),
      thumbnailUrl,
      selected: true,
    });
  }

  const { addImages } = useImageProcessStore.getState();
  addImages(newImages);
  return { count: newImages.length, images: newImages };
}

export interface ProcessImagesResult {
  completed: number;
  failed: number;
  total: number;
}

export async function startImageProcess(): Promise<ProcessImagesResult> {
  const store = useImageProcessStore.getState();
  const {
    images,
    settings,
    clearTasks,
    addTasks,
    setCurrentTaskId,
    updateTaskStatus,
    setIsProcessing,
  } = store;

  const selectedImages = images.filter((img) => img.selected);
  if (selectedImages.length === 0) {
    throw new Error("没有选中的图片，请先加载图片");
  }
  if (!settings.outputDir) {
    throw new Error("未设置输出目录");
  }

  setIsProcessing(true);
  clearTasks();

  const newTasks: ImageProcessTask[] = selectedImages.map((img) => ({
    id: generateId(),
    imageId: img.id,
    fileName: img.fileName,
    status: "pending",
    progress: 0,
  }));
  addTasks(newTasks);

  await invoke("ensure_dir", { path: settings.outputDir });

  for (let i = 0; i < newTasks.length; i++) {
    const task = newTasks[i];
    const image = selectedImages.find((img) => img.id === task.imageId);
    if (!image) continue;

    setCurrentTaskId(task.id);
    updateTaskStatus(task.id, "processing", 10);

    try {
      updateTaskStatus(task.id, "processing", 30);
      const uint8Array = await readFileAsUint8Array(image.filePath);
      const bytes = Array.from(uint8Array);
      const binary = bytes.map((b: number) => String.fromCharCode(b)).join("");
      const base64 = btoa(binary);
      const ext = getFileExt(image.filePath);
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : ext === "gif"
          ? "image/gif"
          : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64}`;

      updateTaskStatus(task.id, "processing", 50);

      const targetFormat = settings.operations.includes("convert")
        ? settings.targetFormat
        : ext;
      const mimeTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      const targetMimeType = mimeTypeMap[targetFormat] || "image/jpeg";

      const result = await processImageWithCanvas(dataUrl, {
        targetWidth: settings.targetWidth,
        targetHeight: settings.targetHeight,
        maintainAspectRatio: settings.maintainAspectRatio,
        quality: settings.quality,
        targetFormat: targetMimeType,
      });

      updateTaskStatus(task.id, "processing", 80);

      const idx = i;
      const outputFileName = settings.operations.includes("rename")
        ? generateRenamedFileName(
            image.fileName,
            settings.renamePattern || "{name}_{index}",
            idx,
            settings.targetFormat
          )
        : `${getFileNameWithoutExt(image.fileName)}_processed.${settings.targetFormat === "jpeg" ? "jpg" : settings.targetFormat}`;

      const outputPath = `${settings.outputDir}/${outputFileName}`;
      await invoke("save_image_file", {
        base64Data: result.dataUrl,
        outputPath,
      });

      updateTaskStatus(task.id, "completed", 100, outputPath, result.blobSize);
    } catch (err) {
      updateTaskStatus(task.id, "failed", 0, undefined, undefined, String(err));
    }
  }

  setCurrentTaskId(null);
  setIsProcessing(false);

  const completed = newTasks.filter((t) => t.status === "completed").length;
  const failed = newTasks.filter((t) => t.status === "failed").length;
  return { completed, failed, total: newTasks.length };
}

export function setImageProcessSettings(settings: {
  outputDir?: string;
  operations?: ("compress" | "convert" | "resize" | "rename")[];
  targetFormat?: ImageFormat;
  quality?: number;
  targetWidth?: number;
  targetHeight?: number;
  maintainAspectRatio?: boolean;
  renamePattern?: string;
}): void {
  const { setOutputDir, setSettings } = useImageProcessStore.getState();
  if (settings.outputDir !== undefined) setOutputDir(settings.outputDir);
  setSettings(settings);
}

export function selectAllImages(selected = true): void {
  useImageProcessStore.getState().selectAllImages(selected);
}
