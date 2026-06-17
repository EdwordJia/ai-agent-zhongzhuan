# OpenClaw MVP 架构设计文档

> 项目：AI Agent 中转（ai-agent-zhongzhuan）
> 定位：跨境电商智能体桌面工具
> 技术栈：Tauri v2 + React 18 + TypeScript + Semi Design + Zustand

---

## 一、项目概述

AI Agent 中转是一款面向跨境电商从业者的桌面智能工具，核心目标是帮助用户高效完成商品资料录入、图片批量处理、AI 内容生成以及一键导出多平台资料包。

### 1.1 核心功能模块

| 模块 | 功能描述 | 优先级 |
|------|----------|--------|
| 商品管理 | 商品资料录入、编辑、分类、检索 | P0 |
| 图片处理 | 批量压缩、格式转换、尺寸调整、水印 | P0 |
| AI 生成 | 商品标题/描述生成、营销文案、AI 生图 | P0 |
| 导出任务 | 一键打包资料包（Excel + 图片 + 视频） | P0 |
| 仪表盘 | 数据统计、任务概览、快捷入口 | P1 |
| 设置 | 主题切换、API 配置、导出模板 | P1 |

### 1.2 设计原则

- **专业深色管理后台风格**：Semi Design 主题定制，蓝色系主色调
- **桌面优先**：利用 Tauri 本地能力（文件系统、对话框、剪贴板）
- **离线可用**：核心功能不依赖网络，AI 模块可配置本地/云端
- **数据本地存储**：SQLite 本地数据库，支持导出备份

---

## 二、页面结构 / 路由设计

```
/                    → Dashboard      仪表盘（默认页）
/products            → ProductList    商品列表
/products/:id        → ProductEdit    商品编辑/详情
/products/new        → ProductEdit    新建商品
/images              → ImageProcess   图片处理
/ai-generate         → AIGenerate     AI 生成
/export              → Export         导出任务
/settings            → Settings       设置
```

### 2.1 路由配置表

| 路径 | 组件 | 标题 | 图标 |
|------|------|------|------|
| `/` | Dashboard | 仪表盘 | LayoutDashboard |
| `/products` | ProductList | 商品管理 | Package |
| `/products/:id` | ProductEdit | 商品详情 | — |
| `/images` | ImageProcess | 图片处理 | Image |
| `/ai-generate` | AIGenerate | AI 生成 | Sparkles |
| `/export` | Export | 导出任务 | Download |
| `/settings` | Settings | 设置 | Settings |

### 2.2 布局结构

```
┌─────────────────────────────────────────────┐
│  Header (Logo + 标题 + 用户信息)              │
├──────────┬──────────────────────────────────┤
│          │                                  │
│  Sidebar │         Content Area             │
│  (Nav)   │         (路由页面)                │
│          │                                  │
│          │                                  │
├──────────┴──────────────────────────────────┤
│  Footer (版本号 + 状态)                       │
└─────────────────────────────────────────────┘
```

---

## 三、核心数据模型

### 3.1 Product（商品）

```typescript
interface Product {
  id: string;                    // 唯一标识（UUID）
  sku: string;                   // 货号（如 HO-A05-0926-02）
  name: string;                  // 商品名称
  category: string;              // 分类
  description: string;           // 商品描述
  price: number;               // 售价
  cost: number;                // 成本价
  currency: string;            // 货币（CNY/USD）
  weight: number;              // 重量(g)
  dimensions: {                  // 尺寸
    length: number;
    width: number;
    height: number;
  };
  material: string;            // 材质
  origin: string;              // 产地
  tags: string[];              // 标签
  status: 'draft' | 'active' | 'archived';  // 状态
  images: MaterialImage[];     // 关联素材图
  createdAt: number;           // 创建时间戳
  updatedAt: number;           // 更新时间戳
}
```

### 3.2 MaterialImage（素材图片）

```typescript
interface MaterialImage {
  id: string;
  productId: string;           // 关联商品ID
  type: 'carousel' | 'detail' | 'video' | 'certificate' | 'thumbnail';
  fileName: string;
  filePath: string;            // 本地绝对路径
  fileSize: number;            // 字节数
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'webp' | 'gif';
  sortOrder: number;           // 排序
  createdAt: number;
}
```

### 3.3 ExportTask（导出任务）

```typescript
interface ExportTask {
  id: string;
  name: string;                // 任务名称
  productIds: string[];        // 包含商品
  template: '1688' | 'alibaba' | 'shopify' | 'custom';  // 导出模板
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputPath?: string;        // 输出目录
  progress: number;            // 0-100
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}
```

### 3.4 AIJob（AI 生成任务）

```typescript
interface AIJob {
  id: string;
  type: 'title' | 'description' | 'image' | 'video';
  productId: string;
  prompt: string;              // 用户输入提示词
  result?: string;             // 生成结果
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model?: string;              // 使用的模型
  createdAt: number;
  completedAt?: number;
}
```

---

## 四、状态管理设计（Zustand）

### 4.1 Store 划分

```
stores/
├── productStore.ts     // 商品数据 CRUD
├── uiStore.ts          // 界面状态（侧边栏、主题）
├── taskStore.ts        // 导出任务队列
└── aiStore.ts          // AI 生成任务
```

### 4.2 productStore

```typescript
interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  filter: {
    keyword: string;
    category: string;
    status: Product['status'] | 'all';
  };
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setCurrentProduct: (product: Product | null) => void;
  setFilter: (filter: Partial<ProductState['filter']>) => void;
  getFilteredProducts: () => Product[];
}
```

### 4.3 uiStore

```typescript
interface UIState {
  sidebarCollapsed: boolean;
  themeMode: 'light' | 'dark' | 'auto';
  activePage: string;
  // Actions
  toggleSidebar: () => void;
  setThemeMode: (mode: UIState['themeMode']) => void;
  setActivePage: (page: string) => void;
}
```

### 4.4 taskStore

```typescript
interface TaskState {
  tasks: ExportTask[];
  activeTaskId: string | null;
  // Actions
  addTask: (task: Omit<ExportTask, 'id' | 'createdAt'>) => void;
  updateTaskStatus: (id: string, status: ExportTask['status'], progress?: number) => void;
  removeTask: (id: string) => void;
}
```

---

## 五、Tauri Commands 设计（Rust 侧）

### 5.1 已实现的命令

| Command | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `get_app_version` | — | `string` | 获取应用版本号 |
| `select_folder` | — | `string \| null` | 打开文件夹选择对话框 |
| `open_external_url` | `url: string` | `Result<(), string>` | 用系统浏览器打开 URL |

### 5.2 计划实现的命令

| Command | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `read_image_dir` | `path: string` | `MaterialImage[]` | 读取目录中的图片列表 |
| `save_product_json` | `product: Product` | `Result<(), string>` | 保存商品到本地 JSON |
| `load_products_json` | — | `Product[]` | 从本地加载所有商品 |
| `export_materials_zip` | `task: ExportTask` | `Result<string, string>` | 导出资料包为 ZIP |
| `copy_to_clipboard` | `text: string` | `Result<(), string>` | 复制文本到剪贴板 |
| `show_in_folder` | `path: string` | `Result<(), string>` | 在资源管理器中打开 |

### 5.3 插件依赖

- `tauri-plugin-opener` — 打开外部链接/文件
- `tauri-plugin-dialog` — 系统对话框（选择文件/文件夹）
- `tauri-plugin-fs` — 文件系统读写

---

## 六、目录结构约定

```
ai-agent-zhongzhuan/
├── docs/                          # 文档
│   ├── mvp-architecture.md        # 本文件
│   └── reference-analysis.md    # 参考物分析
├── src/
│   ├── main.tsx                   # 应用入口（Semi 主题配置）
│   ├── App.tsx                    # 路由根组件
│   ├── router/
│   │   └── index.tsx              # 路由配置
│   ├── layouts/
│   │   └── MainLayout.tsx         # 主布局（Sidebar + Header + Content）
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── index.tsx          # 仪表盘
│   │   ├── ProductList/
│   │   │   └── index.tsx          # 商品列表
│   │   ├── ProductEdit/
│   │   │   └── index.tsx          # 商品编辑
│   │   ├── ImageProcess/
│   │   │   └── index.tsx          # 图片处理
│   │   ├── AIGenerate/
│   │   │   └── index.tsx          # AI 生成
│   │   ├── Export/
│   │   │   └── index.tsx          # 导出任务
│   │   └── Settings/
│   │       └── index.tsx          # 设置
│   ├── stores/
│   │   ├── productStore.ts        # 商品状态
│   │   └── uiStore.ts             # UI 状态
│   ├── types/
│   │   └── index.ts               # 类型定义
│   ├── utils/
│   │   └── helpers.ts             # 工具函数
│   └── vite-env.d.ts              # Vite 类型声明
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                 # Tauri 命令定义
│   │   └── main.rs                # 入口
│   ├── capabilities/
│   │   └── default.json           # 权限配置
│   ├── Cargo.toml                 # Rust 依赖
│   └── tauri.conf.json            # Tauri 配置
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## 七、Semi Design 主题配置

### 7.1 主色调

采用专业深色管理后台风格，以深蓝/靛蓝为主色：

| Token | 值 | 用途 |
|-------|-----|------|
| `--semi-color-primary` | `#3b82f6` | 主色（按钮、链接） |
| `--semi-color-primary-hover` | `#2563eb` | 主色悬停 |
| `--semi-color-bg-0` | `#0f172a` | 深色背景（侧边栏） |
| `--semi-color-bg-1` | `#1e293b` | 内容区背景 |
| `--semi-color-bg-2` | `#334155` | 卡片背景 |
| `--semi-color-text-0` | `#f8fafc` | 主文字 |
| `--semi-color-text-1` | `#cbd5e1` | 次要文字 |
| `--semi-color-border` | `#475569` | 边框 |

### 7.2 布局尺寸

| 元素 | 尺寸 |
|------|------|
| 侧边栏展开宽度 | 240px |
| 侧边栏折叠宽度 | 64px |
| 顶部 Header 高度 | 56px |
| 内容区内边距 | 24px |

---

## 八、后续开发计划

### Phase 1（当前脚手架）
- [x] 基础路由与布局
- [x] Semi Design 主题集成
- [x] Zustand Store 搭建
- [x] Tauri 基础命令

### Phase 2（商品管理）
- [ ] 商品列表表格（搜索、筛选、分页）
- [ ] 商品表单（新建/编辑）
- [ ] 商品详情页
- [ ] 本地数据持久化

### Phase 3（图片处理）
- [ ] 图片批量上传
- [ ] 图片预览网格
- [ ] 批量压缩/格式转换
- [ ] 水印添加

### Phase 4（AI 生成）
- [ ] LLM 配置管理
- [ ] 商品标题生成
-- [ ] 商品描述生成
- [ ] AI 图像生成（接入 ComfyUI/RunningHub）

### Phase 5（导出任务）
- [ ] 导出模板配置
- [ ] 一键导出 ZIP
- [ ] 多平台格式适配
- [ ] 导出历史记录

---

*文档版本：v1.0*
*更新日期：2026-06-16*
