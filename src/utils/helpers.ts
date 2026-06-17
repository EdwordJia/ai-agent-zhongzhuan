/** 格式化日期时间戳为本地字符串 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** 格式化文件大小（字节 → KB/MB/GB） */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/** 防抖函数 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** 生成货号（SKU）：客户缩写 + 日期 + 序号 */
export function generateSku(
  prefix: string = "HO",
  date: Date = new Date()
): string {
  const y = date.getFullYear().toString().slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `${prefix}-${y}${m}${d}-${seq}`;
}

/** 深拷贝 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ========== 图片处理辅助函数 ==========

/** 从文件路径提取文件名（不含扩展名） */
export function getFileNameWithoutExt(filePath: string): string {
  const fileName = filePath.split(/[\\/]/).pop() || "";
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

/** 从文件路径提取扩展名 */
export function getFileExt(filePath: string): string {
  const fileName = filePath.split(/[\\/]/).pop() || "";
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : "";
}

/** 将文件转为 Base64 DataURL */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 通过 Tauri fs API 读取文件并转为 base64 dataURL */
export async function readFileAsBase64(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { readFile } = await import("@tauri-apps/plugin-fs" as any);
  const uint8Array = await readFile(filePath);
  const bytes = Array.from(uint8Array as Uint8Array);
  const binary = bytes.map((b: number) => String.fromCharCode(b)).join("");
  const base64 = btoa(binary);
  const ext = getFileExt(filePath);
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

/** 加载图片并获取尺寸 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 使用 Canvas 处理图片（压缩/缩放/格式转换） */
export async function processImageWithCanvas(
  imageSrc: string,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    maintainAspectRatio?: boolean;
    quality?: number;
    targetFormat?: string;
  }
): Promise<{ dataUrl: string; width: number; height: number; blobSize: number }> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let { width, height } = img;

  // 尺寸调整
  if (options.targetWidth || options.targetHeight) {
    if (options.maintainAspectRatio !== false) {
      const ratio = Math.min(
        (options.targetWidth || width) / width,
        (options.targetHeight || height) / height
      );
      if (ratio < 1) {
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
    } else {
      width = options.targetWidth || width;
      height = options.targetHeight || height;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const format = options.targetFormat || "image/jpeg";
  const quality = options.quality !== undefined ? options.quality / 100 : 0.9;
  const dataUrl = canvas.toDataURL(format, quality);

  // 计算 blob 大小
  const base64 = dataUrl.split(",")[1];
  const blobSize = Math.round((base64.length * 3) / 4);

  return { dataUrl, width, height, blobSize };
}

/** 将 base64 dataURL 转为 Uint8Array */
export function base64ToUint8Array(base64Data: string): Uint8Array {
  const base64 = base64Data.split(",")[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** 生成重命名后的文件名 */
export function generateRenamedFileName(
  originalName: string,
  pattern: string,
  index: number,
  targetFormat: string
): string {
  const nameWithoutExt = getFileNameWithoutExt(originalName);
  const ext = targetFormat === "jpeg" ? "jpg" : targetFormat;

  let result = pattern;
  result = result.replace(/\{name\}/g, nameWithoutExt);
  result = result.replace(/\{index\}/g, String(index + 1).padStart(3, "0"));
  result = result.replace(/\{timestamp\}/g, String(Date.now()));
  result = result.replace(/\{ext\}/g, ext);

  // 如果 pattern 不包含占位符，使用默认格式
  if (!result.includes("{name}") && !result.includes("{index}")) {
    result = `${nameWithoutExt}_${String(index + 1).padStart(3, "0")}`;
  }

  return `${result}.${ext}`;
}
