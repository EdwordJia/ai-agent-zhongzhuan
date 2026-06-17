/**
 * Tauri Core API Mock — 用于在浏览器中运行前端应用，无需 Tauri 后端。
 * 通过 Vite alias 替换 @tauri-apps/api/core 的 invoke 函数。
 */

export interface TestTauriMock {
  nextFolder: string | null;
  nextImages: string[] | null;
  imageDirs: Record<string, string[]>;
  fs: Record<string, Uint8Array>;

  reset(): void;
  setNextFolder(path: string): void;
  setNextImages(paths: string[]): void;
  setImageDir(path: string, files: string[]): void;
  seedFile(path: string, base64DataUrl: string): void;
}

const LOCAL_STORAGE_KEY = "mock-tauri-products";

declare global {
  interface Window {
    __testTauriMock: TestTauriMock;
  }
}

function createMock(): TestTauriMock {
  return {
    nextFolder: null,
    nextImages: null,
    imageDirs: {},
    fs: {},

    reset() {
      this.nextFolder = null;
      this.nextImages = null;
      this.imageDirs = {};
      this.fs = {};
    },

    setNextFolder(path: string) {
      this.nextFolder = path;
    },

    setNextImages(paths: string[]) {
      this.nextImages = paths;
    },

    setImageDir(path: string, files: string[]) {
      this.imageDirs[path] = files;
    },

    seedFile(path: string, base64DataUrl: string) {
      const base64 = base64DataUrl.split(",")[1];
      if (!base64) {
        this.fs[path] = new Uint8Array(0);
        return;
      }
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      this.fs[path] = bytes;
    },
  };
}

// 模块加载时初始化全局 mock 对象（保留已存在的状态，避免页面 reload 覆盖测试 seed）
if (typeof window !== "undefined") {
  window.__testTauriMock = window.__testTauriMock || createMock();
}

// ====== localStorage 商品持久化辅助函数 ======

function loadProductsFromStorage(): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveProductsToStorage(products: Record<string, unknown>[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
}

// ====== invoke 命令处理器 ======

const handlers: Record<string, (args?: Record<string, unknown>) => unknown> = {
  greet: () => "Hello, Web Test!",

  get_app_version: () => "0.1.0-web",

  select_folder: () => {
    const mock = window.__testTauriMock;
    if (mock.nextFolder) {
      const result = mock.nextFolder;
      mock.nextFolder = null;
      return result;
    }
    return "/mock/input";
  },

  select_images: () => {
    const mock = window.__testTauriMock;
    if (mock.nextImages) {
      const result = mock.nextImages;
      mock.nextImages = null;
      return result;
    }
    return [];
  },

  read_image_dir: (args) => {
    const path = String(args?.path ?? "");
    const mock = window.__testTauriMock;
    return mock.imageDirs[path] ?? [];
  },

  ensure_dir: () => undefined,

  save_image_file: (args) => {
    const base64Data = String(args?.base64Data ?? "");
    const outputPath = String(args?.outputPath ?? "");
    if (!base64Data || !outputPath) return undefined;

    const base64 = base64Data.split(",")[1];
    if (!base64) return undefined;

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    window.__testTauriMock.fs[outputPath] = bytes;
    return undefined;
  },

  save_product_json: (args) => {
    const product = args?.product as Record<string, unknown> | undefined;
    if (!product) return undefined;

    const products = loadProductsFromStorage();
    const index = products.findIndex((p) => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    saveProductsToStorage(products);
    return undefined;
  },

  load_products_json: () => {
    return loadProductsFromStorage();
  },

  delete_product_json: (args) => {
    const id = String(args?.id ?? "");
    if (!id) return undefined;
    const products = loadProductsFromStorage().filter((p) => p.id !== id);
    saveProductsToStorage(products);
    return undefined;
  },

  export_product_package: (args) => {
    const task = args?.task as Record<string, unknown> | undefined;
    const productIds = (task?.productIds as string[]) ?? [];
    const allProducts = loadProductsFromStorage();
    const selectedProducts = allProducts.filter((p) => productIds.includes(String(p.id)));

    let imageCount = 0;
    let videoCount = 0;
    for (const p of selectedProducts) {
      const images = Array.isArray(p.images) ? (p.images as Record<string, unknown>[]) : [];
      for (const img of images) {
        const format = String(img.format ?? "").toLowerCase();
        if (format === "mp4" || format === "mov" || format === "avi") {
          videoCount++;
        } else {
          imageCount++;
        }
      }
    }

    return {
      zipPath: "/mock/export/package.zip",
      productCount: selectedProducts.length,
      imageCount,
      videoCount,
    };
  },

  show_in_folder: () => undefined,

  open_external_url: () => undefined,
};

/**
 * 模拟 Tauri invoke 函数。
 * 根据 cmd 名称路由到对应的 mock 处理器。
 */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const handler = handlers[cmd];
  if (!handler) {
    console.warn(`[tauri-mock] 未处理的命令: ${cmd}`, args);
    return undefined as unknown as T;
  }
  const result = handler(args);
  return Promise.resolve(result as T);
}

/**
 * 将函数转换为 Tauri 命令字符串格式（与真实 API 兼容）。
 * 真实 Tauri 中此函数不存在，但某些代码可能使用它。
 */
export function transformCallback<T>(
  _callback: (response: T) => void,
  _once: boolean = false
): number {
  return 0;
}
