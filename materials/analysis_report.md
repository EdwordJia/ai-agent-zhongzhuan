# 目录分析报告

## 一、项目概述

本次分析了 `D:\develoment_home\project_home\ai-agent-zhongzhuan\materials\` 下的两个已解压目录：

| 目录 | 来源压缩包 | 大小 | 项目性质 |
|------|------------|------|----------|
| `_extract_HO-A05/HO-A05-0926-02` | `HO-A05-0926-02.zip` | 49.3 MB | **电商产品素材包**（非代码项目） |
| `_extract_Pixelle/Pixelle-Video-main` | `Pixelle-Video-main(1).zip` | 8.8 MB | **AI 全自动短视频生成平台**（开源 Python 项目） |

- **HO-A05-0926-02**：围绕一款名为“HOYGI 蜂毒保湿身体乳霜”的商品整理的上架资料，包括产品图片、视频、Excel 资料表和格式说明文档，主要用于 1688 / 阿里 / 外贸等电商平台的商品发布。
- **Pixelle-Video-main**：AIDC-AI 开源的 **Pixelle-Video**，输入一个主题即可自动生成文案、配图/视频、语音、背景音乐并合成短视频；采用 `Apache-2.0` 许可证。

---

## 二、目录结构（关键层级）

### 2.1 `_extract_HO-A05/HO-A05-0926-02`

```
HO-A05-0926-02/
├── 2pcs预览图/
│   ├── image-1779971573_副本.png
│   └── image-1779971685.png
├── 产品视频/
│   └── df31eef8155444279bf225fd60d2435f.mp4
├── 产品详情图/
│   ├── 22.png
│   ├── 33.jpg
│   ├── 44.jpg
│   ├── 55.jpg
│   ├── 66.jpg
│   ├── 77.png
│   ├── 88.png
│   └── 99.png
├── 产品资质/
│   ├── 产品页面截图1.png
│   ├── 产品页面截图2.png
│   ├── 企业设施截图1.png
│   ├── 标签图.jpg
│   └── 正面图.jpg
├── 产品轮播图/
│   ├── 11.png
│   ├── 110.png
│   ├── 22.png
│   ├── 33.jpg
│   ├── 44.jpg
│   ├── 55.jpg
│   ├── 66.jpg
│   ├── 77.png
│   ├── 88.png
│   └── 99.png
├── 推品资料-9c549233052540c4b41c530e1131a1a6.xlsx
└── 格式说明.docx
```

### 2.2 `_extract_Pixelle/Pixelle-Video-main`

```
Pixelle-Video-main/
├── api/                          # FastAPI 后端
│   ├── app.py
│   ├── config.py
│   ├── dependencies.py
│   ├── routers/                  # 路由：content, files, frame, health, image, llm, resources, tasks, tts, video
│   ├── schemas/                  # Pydantic 模型
│   └── tasks/                    # 异步任务管理
├── web/                          # Streamlit Web UI
│   ├── app.py
│   ├── components/               # 页面组件
│   ├── i18n/locales/             # 中英文国际化
│   ├── pages/                    # 1_🎬_Home.py, 2_📚_History.py
│   ├── pipelines/                # 前端流水线封装
│   ├── state/                    # 会话状态
│   └── utils/
├── pixelle_video/                # 核心 SDK
│   ├── service.py                # PixelleVideoCore 服务总线
│   ├── llm_presets.py            # LLM 预设
│   ├── tts_voices.py             # TTS 音色配置
│   ├── config/                   # 配置加载/校验
│   ├── models/                   # 数据模型
│   ├── pipelines/                # 视频生成流水线
│   ├── prompts/                  # 各类生成提示词
│   ├── services/                 # LLM/TTS/媒体/视频/帧处理等服务
│   └── utils/
├── workflows/                    # ComfyUI 工作流 JSON
│   ├── runninghub/               # 云端 RunningHub 工作流
│   └── selfhost/                 # 本地 ComfyUI 工作流
├── templates/                    # HTML 帧模板（按 1080x1080/1080x1920/1920x1080 分组）
├── docs/                         # MkDocs 多语言文档（zh / en）
├── packaging/windows/            # Windows 便携版打包脚本
├── bgm/default.mp3               # 默认背景音乐
├── resources/                    # 截图、二维码等
├── pyproject.toml
├── config.example.yaml
├── docker-compose.yml
├── Dockerfile
├── README.md / README_EN.md
├── mkdocs.yml
└── start_web.bat / start_web.sh / docker-start.sh
```

---

## 三、技术栈分析

### 3.1 HO-A05-0926-02

- **无技术栈/非软件项目**，全部为电商运营素材：
  - 文档：Microsoft Word（`.docx`）、Microsoft Excel（`.xlsx`）
  - 图片：`.png`、`.jpg`（产品轮播图、详情图、资质图、预览图）
  - 视频：`.mp4`（产品宣传视频）

### 3.2 Pixelle-Video-main

| 层级 | 技术/工具 |
|------|-----------|
| 编程语言 | Python 3.11+ |
| 包管理 | `uv`（推荐），兼容 `pip`；`hatchling` 构建后端 |
| Web UI | Streamlit 1.40+（多页面应用，含 `st.navigation`） |
| 后端 API | FastAPI + Uvicorn |
| 数据校验/模型 | Pydantic 2.x |
| 日志 | loguru |
| 配置 | YAML（`pyproject.toml` + `config.yaml`） |
| HTTP 请求 | httpx |
| 音视频处理 | ffmpeg-python、moviepy 1.0.3、Pillow、BGM 合成 |
| 浏览器/截图 | Playwright（Chromium） |
| LLM 接入 | OpenAI SDK 兼容接口（通义千问、GPT-4o、DeepSeek、Ollama、Claude、Moonshot 等） |
| AI 媒体生成 | ComfyUI / RunningHub（ComfyKit 封装）；支持 FLUX、Stable Diffusion、Qwen、WAN 2.1、LTX、Nano Banana 等 |
| TTS | Edge-TTS、Index-TTS（支持声音克隆）等 ComfyUI 工作流 |
| 工作流定义 | JSON 格式 ComfyUI workflow（`workflows/runninghub/`、`workflows/selfhost/`） |
| 文档站点 | MkDocs Material + `mkdocs-static-i18n` + `mkdocs-git-revision-date-localized-plugin` |
| 容器化 | Docker、docker-compose（api + web + init 服务） |
| 国际化 | Web UI 中英文 JSON 语言包（`web/i18n/locales/`） |
| Windows 打包 | Python 嵌入式 + FFmpeg 便携版 + `build.py` |

#### 核心依赖（来自 `pyproject.toml`）

```toml
name = "pixelle-video"
version = "0.1.15"
requires-python = ">=3.11"
dependencies = [
    "fastmcp>=2.0.0",
    "pydantic>=2.0.0",
    "loguru>=0.7.0",
    "pyyaml>=6.0.0",
    "edge-tts==7.2.7",
    "certifi>=2025.10.5",
    "ffmpeg-python>=0.2.0",
    "httpx>=0.28.1",
    "pillow>=10.0.0,<12",
    "streamlit>=1.40.0",
    "openai>=2.6.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "python-multipart>=0.0.12",
    "comfykit>=0.1.12",
    "beautifulsoup4>=4.14.2",
    "moviepy==1.0.3",
    "playwright>=1.58.0",
]
```

---

## 四、功能模块推测

### 4.1 HO-A05-0926-02（电商产品资料包）

- **产品主数据**：Excel 中记录货号、标题、箱规、尺寸、材质、成分、净重/毛重、采购价、货期、外部参考链接等。
- **视觉素材**：
  - 产品轮播图（最多 10 张，按展示顺序命名）
  - 2pcs 组合变体预览图
  - 产品详情长图
  - 产品资质/工厂/标签/正面实拍图
- **视频素材**：单个产品宣传视频。
- **使用场景**：1688 / 阿里国际站 / 独立站 / 外贸 B2B 的商品上架、推品资料分发。

### 4.2 Pixelle-Video-main（AI 短视频生成平台）

| 模块 | 功能 |
|------|------|
| **文案生成** | 输入主题，由 LLM 自动生成解说词；或直接使用固定文案。 |
| **分镜/故事板** | 将文案拆分为多个分镜，规划每帧画面。 |
| **图像生成** | 基于 ComfyUI 工作流生成每句配图，支持 FLUX、SDXL、Qwen 等。 |
| **视频生成** | 基于 WAN 2.1 / LTX 等工作流生成动态视频背景，配合 `video_*.html` 模板。 |
| **语音合成** | 通过 Edge-TTS、Index-TTS 等工作流生成解说语音，支持参考音频克隆音色。 |
| **背景音乐** | 可叠加 `bgm/` 下的背景音乐并调节音量。 |
| **帧模板/样式** | HTML 模板引擎（Playwright 渲染），按 1080x1080、1080x1920、1920x1080 分组，支持 static/image/video 三类模板。 |
| **视频合成** | 将分镜画面、语音、BGM 合成为最终 MP4。 |
| **Web UI** | Streamlit 三栏式界面：左侧内容输入、中间语音/视觉设置、右侧生成/预览；含历史记录页。 |
| **REST API** | FastAPI 提供同步/异步视频生成、任务查询、文件访问、LLM/TTS/图像等原子接口。 |
| **任务管理** | 异步任务队列，适合长视频生成。 |
| **扩展流水线** | 标准流水线、自定义流水线、素材驱动流水线，以及数字人口播、图生视频（I2V）、动作迁移等实验模块。 |
| **打包分发** | Windows 一键整合包，内置 Python、FFmpeg 与依赖，双击 `start.bat` 即可运行。 |

---

## 五、关键文件内容摘要

### 5.1 HO-A05-0926-02

#### `格式说明.docx`
> 1. 产品文件夹为货号  
> 2. 产品轮播图放这里，最多放 10 个，按你想展示的顺序进行排序  
> 4. 2 个组合变体预览图放这里

#### `推品资料-9c549233052540c4b41c530e1131a1a6.xlsx`
- 仅含一个工作表 `Sheet1`。
- 关键字段与示例值：
  - **关键词 / 1688 上架标题**：蜂毒保湿身体乳霜 / 蜂毒保湿身体乳霜淡纹护理提拉紧致保湿身体乳蜂蜜
  - **产品编码**：`HO-A05-0926-02`
  - **产品尺寸约**：`7*13.6CM`
  - **包装尺寸约**：`7.2*3.8*13.8CM`
  - **产品包装**：盒装
  - **产品包材材质**：PET
  - **产品成分**：水、甘油、鲸蜡硬脂醇、甘油硬脂酸酯、卡波姆、三乙醇胺、向日葵籽油、蜂毒、蜂蜜
  - **净重**：150 g
  - **毛重约**：199 g
  - **箱规**：`56*36*21 CM`
  - **装箱数**：406 PCS
  - **一箱重量**：81.54 KG
  - **采购价格（RMB）**：5 元
  - **回货时间 / 货期情况说明**：新品，货期 7 天
  - **外部链接 1**：`https://www.gifttree.co.nz/products/gift-tree-rozino-bee-venom-skincare-combo-set-hydrating-and-firming`

### 5.2 Pixelle-Video-main

#### `README.md`
- 项目口号：输入一个主题，AI 自动完成文案、配图/视频、语音、BGM、视频合成。
- 最近更新（至 2026-01-26）包括：动作迁移、数字人口播、图生视频、RunningHub 48G 显存支持、ComfyUI API Key、Windows 整合包等。
- 使用方式：Windows 推荐一键整合包；其他平台使用 `uv run streamlit run web/app.py`。
- 费用：本地 Ollama + ComfyUI 可完全免费；推荐通义千问 + 本地 ComfyUI。

#### `pyproject.toml`
- 项目名 `pixelle-video`，版本 `0.1.15`，Python `>=3.11`，Apache-2.0。
- 定义了完整运行时依赖与 dev 依赖（pytest、pytest-asyncio、ruff）。

#### `config.example.yaml`
- `llm`：支持任意 OpenAI SDK 兼容 API（Qwen / GPT-4o / DeepSeek / Ollama 等）。
- `comfyui`：本地 ComfyUI URL / API Key，RunningHub API Key、并发限制、实例类型（24G/48G）。
- `comfyui.tts/image/video`：默认工作流配置。
- `template.default_template`：默认 `1080x1920/image_default.html`。

#### `docker-compose.yml`
- `init` 服务：自动从 `config.example.yaml` 复制生成 `config.yaml`。
- `api` 服务：FastAPI，端口 `8000`，健康检查 `/health`。
- `web` 服务：Streamlit，端口 `8501`。
- 共享卷：`config.yaml`、`data/`、`output/`。

#### `Dockerfile`
- 基于 `python:3.11-slim`。
- 安装 `curl`、`ffmpeg`、`fonts-noto-cjk`。
- 使用 `uv` 安装依赖，并预装 Playwright Chromium。
- 暴露 `8000`、`8501`。

#### `pixelle_video/service.py`
- 定义 `PixelleVideoCore` 核心服务类。
- 统一调度 `LLMService`、`TTSService`、`MediaService`、`VideoService`、`FrameProcessor`、`PersistenceService`、`HistoryManager`。
- 通过 `ComfyKit` 与本地/云端 ComfyUI 交互，支持配置热重载。
- 集成多条视频生成流水线：`StandardPipeline`、`CustomPipeline`、`AssetBasedPipeline`。

#### `pixelle_video/llm_presets.py`
- 预置 6 种 LLM 提供商：Qwen、OpenAI、Claude、DeepSeek、Ollama、Moonshot。
- 均使用 OpenAI SDK 协议。

#### `docs/zh/development/architecture.md`
- 三层架构：Web 层（Streamlit）、服务层（核心业务逻辑）、ComfyUI 层（图像/TTS 生成）。
- 主要组件：PixelleVideoCore、LLM Service、Image Service、TTS Service、Video Generator。

#### `docs/zh/reference/api-overview.md`
- Python SDK：`PixelleVideoCore`。
- REST API 关键端点：
  - `POST /api/video/generate/sync`（同步生成）
  - `POST /api/video/generate/async`（异步生成）
  - `GET /api/tasks/{task_id}`（任务状态）
- Swagger UI：`http://localhost:8000/docs`

---

## 六、总结

- **`HO-A05-0926-02`** 是一个**商品上架素材包**，没有代码、配置文件或技术框架，核心内容是产品图片、视频、Excel 资料表和格式说明，服务于电商运营场景。
- **`Pixelle-Video-main`** 是一个**功能完整的 AI 短视频生成工程**，采用 Python + FastAPI + Streamlit + ComfyUI/RunningHub 的技术组合，支持从文案到成片的端到端自动化，并提供了 Web UI、REST API、Docker 部署、Windows 整合包和完整的中英文文档体系。
