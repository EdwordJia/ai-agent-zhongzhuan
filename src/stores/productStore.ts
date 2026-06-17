import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Product, ProductFilter } from "../types";

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  filter: ProductFilter;
  isLoading: boolean;

  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setCurrentProduct: (product: Product | null) => void;
  setFilter: (filter: Partial<ProductFilter>) => void;
  getFilteredProducts: () => Product[];
  loadProducts: () => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
}

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useProductStore = create<ProductState>((set, get) => {
  const store: ProductState = {
    products: [],
    currentProduct: null,
    filter: {
      keyword: "",
      category: "",
      status: "all",
    },
    isLoading: false,

    loadProducts: async () => {
      set({ isLoading: true });
      try {
        const data = await invoke<Record<string, unknown>[]>("load_products_json");
        const products: Product[] = data.map((item) => ({
          id: String(item.id || generateId()),
          sku: String(item.sku || ""),
          name: String(item.name || ""),
          category: String(item.category || ""),
          description: String(item.description || ""),
          price: Number(item.price) || 0,
          cost: Number(item.cost) || 0,
          currency: String(item.currency || "CNY"),
          weight: Number(item.weight) || 0,
          dimensions: (item.dimensions as Product["dimensions"]) || { length: 0, width: 0, height: 0 },
          material: String(item.material || ""),
          origin: String(item.origin || ""),
          tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
          status: (item.status as Product["status"]) || "draft",
          images: Array.isArray(item.images) ? (item.images as Product["images"]) : [],
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now(),
        }));
        set({ products });
      } catch (error) {
        console.error("加载商品失败:", error);
      } finally {
        set({ isLoading: false });
      }
    },

    saveProduct: async (product) => {
      try {
        await invoke("save_product_json", { product });
      } catch (error) {
        console.error("保存商品失败:", error);
        throw error;
      }
    },

    addProduct: async (product) => {
      const now = Date.now();
      const newProduct: Product = {
        ...product,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await get().saveProduct(newProduct);
      set((state) => ({
        products: [newProduct, ...state.products],
        currentProduct: newProduct,
      }));
    },

    updateProduct: async (id, updates) => {
      const existing = get().products.find((p) => p.id === id);
      if (!existing) return;

      const updated: Product = { ...existing, ...updates, updatedAt: Date.now() };
      await get().saveProduct(updated);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
        currentProduct:
          state.currentProduct?.id === id ? updated : state.currentProduct,
      }));
    },

    deleteProduct: async (id) => {
      try {
        await invoke("delete_product_json", { id });
      } catch (error) {
        console.error("删除商品文件失败:", error);
      }
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        currentProduct:
          state.currentProduct?.id === id ? null : state.currentProduct,
      }));
    },

    setCurrentProduct: (product) => {
      set({ currentProduct: product });
    },

    setFilter: (filter) => {
      set((state) => ({ filter: { ...state.filter, ...filter } }));
    },

    getFilteredProducts: () => {
      const { products, filter } = get();
      return products.filter((p) => {
        const matchKeyword =
          !filter.keyword ||
          p.name.toLowerCase().includes(filter.keyword.toLowerCase()) ||
          p.sku.toLowerCase().includes(filter.keyword.toLowerCase());
        const matchCategory =
          !filter.category || p.category === filter.category;
        const matchStatus =
          filter.status === "all" || p.status === filter.status;
        return matchKeyword && matchCategory && matchStatus;
      });
    },
  };

  // 应用启动时从持久化存储加载商品
  store.loadProducts();

  return store;
});
