import { useState, useCallback, useMemo } from "react";
import {
  Card,
  Typography,
  Button,
  TextArea,
  Select,
  Row,
  Col,
  Space,
  Empty,
  Toast,
  Spin,
  Tag,
  Tooltip,
  Divider,
  Checkbox,
} from "@douyinfe/semi-ui";
import {
  Palette,
  Image as ImageIcon,
  Package,
  Wand2,
  Send,
  Copy,
  Check,
  FolderOpen,
  ArrowRightLeft,
  Sparkles,
  Images,
  Coins,
} from "lucide-react";
import { useProductStore } from "../../stores/productStore";
import { useUserStore } from "../../stores/userStore";
import { invoke } from "@tauri-apps/api/core";
import { generateId } from "../../utils/helpers";
import type { MaterialImage } from "../../types";
import {
  generateImages,
  generateProductImagePrompt,
  type ImageSize,
  type ImageQuality,
  type ImageOutputFormat,
  type ImageBackground,
  type ImageGenerationResult,
} from "../../services/imageGenerationService";

const { Title, Text } = Typography;
const { Option } = Select;

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "1024x1024", label: "1024 × 1024（方形）" },
  { value: "1024x1536", label: "1024 × 1536（竖图）" },
  { value: "1536x1024", label: "1536 × 1024（横图）" },
  { value: "auto", label: "自动" },
];

const QUALITY_OPTIONS: { value: ImageQuality; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低（更快）" },
  { value: "medium", label: "中" },
  { value: "high", label: "高（更精细）" },
];

const FORMAT_OPTIONS: { value: ImageOutputFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

const BACKGROUND_OPTIONS: { value: ImageBackground; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "opaque", label: "不透明" },
  { value: "transparent", label: "透明" },
];

const COUNT_OPTIONS = [
  { value: 1, label: "1 张" },
  { value: 4, label: "4 张" },
  { value: 8, label: "8 张（Midjourney 风格）" },
];

interface GeneratedImage extends ImageGenerationResult {
  id: string;
}

export default function AIImageGenerate() {
  const products = useProductStore((s) => s.products);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const userStore = useUserStore();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("auto");
  const [outputFormat, setOutputFormat] = useState<ImageOutputFormat>("png");
  const [background, setBackground] = useState<ImageBackground>("auto");
  const [count, setCount] = useState<number>(8);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveDir, setSaveDir] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const allSelected = useMemo(
    () => generatedImages.length > 0 && selectedImageIds.size === generatedImages.length,
    [generatedImages, selectedImageIds]
  );

  // Check if user can generate (has points or free quota)
  const canGenerate = useMemo(() => {
    if (userStore.points > 0) return true;
    if (userStore.freeDailyUsed < userStore.freeDailyLimit) return true;
    return false;
  }, [userStore.points, userStore.freeDailyUsed, userStore.freeDailyLimit]);

  const handleGeneratePrompt = useCallback(async () => {
    if (!selectedProduct) {
      Toast.warning("请先选择一个商品");
      return;
    }
    const generated = await generateProductImagePrompt(selectedProduct, prompt);
    setPrompt(generated);
    Toast.success("已生成商品摄影提示词");
  }, [selectedProduct, prompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      Toast.warning("请输入生图提示词");
      return;
    }

    // Refresh points before checking
    await userStore.refreshPoints();

    if (!canGenerate) {
      Toast.error("积分不足或今日免费额度已用完，请使用兑换码充值");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);
    setSelectedImageIds(new Set());

    try {
      const results = await generateImages({
        prompt: prompt.trim(),
        n: count,
        size,
        quality,
        outputFormat,
        background,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name,
      });

      const withIds = results.map((r) => ({ ...r, id: generateId() }));
      setGeneratedImages(withIds);
      setSelectedImageIds(new Set(withIds.map((i) => i.id)));

      // Refresh points after generation
      await userStore.refreshPoints();
      Toast.success(`生成成功，剩余积分 ${userStore.points}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "图片生成失败";
      // Check if it's a 402 payment required error
      if (msg.includes("402") || msg.includes("余额不足") || msg.includes("points")) {
        Toast.error("积分不足，请使用兑换码充值");
      } else {
        Toast.error(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, count, size, quality, outputFormat, background, selectedProduct, canGenerate, userStore]);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(generatedImages.map((i) => i.id)));
    }
  }, [allSelected, generatedImages]);

  const toggleSelectImage = useCallback((id: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopyUrl = useCallback(async (imageUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopiedId(id);
      Toast.success("图片链接已复制");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Toast.error("复制失败");
    }
  }, []);

  const handleSelectSaveDir = useCallback(async () => {
    try {
      const result = await invoke<string | null>("select_folder");
      if (result) {
        setSaveDir(result);
        Toast.success("已设置保存目录");
      }
    } catch (err) {
      Toast.error("选择目录失败: " + String(err));
    }
  }, []);

  const getImageDimensions = useCallback((src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = src;
    });
  }, []);

  const handleSaveSelectedToProduct = useCallback(async () => {
    if (!selectedProduct) {
      Toast.warning("请先选择一个关联商品");
      return;
    }
    const imagesToSave = generatedImages.filter((i) => selectedImageIds.has(i.id));
    if (imagesToSave.length === 0) {
      Toast.warning("请先选择要保存的图片");
      return;
    }

    setSaving(true);
    try {
      let dir = saveDir;
      const needLocalSave = imagesToSave.some((i) => i.imageUrl.startsWith("data:"));
      if (needLocalSave && !dir) {
        dir = (await invoke<string | null>("select_folder")) || "";
        if (!dir) {
          Toast.warning("未选择保存目录");
          setSaving(false);
          return;
        }
        setSaveDir(dir);
      }

      const newImages: MaterialImage[] = [];
      for (const item of imagesToSave) {
        let filePath = item.imageUrl;
        let fileSize = 0;

        if (item.imageUrl.startsWith("data:")) {
          const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
          const fileName = `generated_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const outputPath = `${dir}/${fileName}`;
          await invoke("save_image_file", { base64Data: item.imageUrl, outputPath });
          filePath = outputPath;
          const base64 = item.imageUrl.split(",")[1] || "";
          fileSize = Math.round((base64.length * 3) / 4);
        }

        const dimensions = await getImageDimensions(item.imageUrl);
        newImages.push({
          id: generateId(),
          productId: selectedProduct.id,
          type: "carousel",
          fileName: filePath.split(/[\\/]/).pop() || `generated.${outputFormat}`,
          filePath,
          fileSize,
          width: dimensions.width || (size === "auto" ? 1024 : parseInt(size.split("x")[0], 10)),
          height: dimensions.height || (size === "auto" ? 1024 : parseInt(size.split("x")[1] || "1024", 10)),
          format: outputFormat === "jpeg" ? "jpg" : outputFormat,
          sortOrder: selectedProduct.images.length + newImages.length,
          createdAt: Date.now(),
        });
      }

      await updateProduct(selectedProduct.id, {
        images: [...selectedProduct.images, ...newImages],
      });
      Toast.success(`已保存 ${newImages.length} 张到商品素材`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      Toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [
    selectedProduct,
    generatedImages,
    selectedImageIds,
    saveDir,
    outputFormat,
    size,
    updateProduct,
    getImageDimensions,
  ]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
          AI 生图
        </Title>
        <Text type="tertiary">调用 GPT Image2 付费生图，一次可生成 1/4/8 张商品素材</Text>
      </div>

      <Row gutter={16}>
        <Col span={10}>
          <Card
            style={{
              background: "var(--semi-color-bg-2, #334155)",
              border: "1px solid var(--semi-color-border, #475569)",
              marginBottom: 16,
            }}
            bodyStyle={{ padding: 20 }}
            title={
              <Space>
                <Package size={16} color="#3b82f6" />
                <span style={{ color: "#f8fafc" }}>关联商品（可选）</span>
              </Space>
            }
          >
            <Select
              placeholder="选择要关联的商品"
              style={{ width: "100%" }}
              value={selectedProductId || undefined}
              onChange={(v) => setSelectedProductId(v as string)}
              filter
              showClear
            >
              {products.map((p) => (
                <Option key={p.id} value={p.id}>
                  <Space>
                    <span>{p.name}</span>
                    <Tag size="small" type="light">
                      {p.sku}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
            {selectedProduct && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  background: "var(--semi-color-bg-3, #475569)",
                  borderRadius: 6,
                }}
              >
                <Text strong style={{ color: "#f8fafc" }}>
                  {selectedProduct.name}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>
                    SKU: {selectedProduct.sku} | 分类: {selectedProduct.category}
                  </Text>
                </div>
              </div>
            )}
          </Card>

          <Card
            style={{
              background: "var(--semi-color-bg-2, #334155)",
              border: "1px solid var(--semi-color-border, #475569)",
              marginBottom: 16,
            }}
            bodyStyle={{ padding: 20 }}
            title={
              <Space>
                <Wand2 size={16} color="#10b981" />
                <span style={{ color: "#f8fafc" }}>提示词</span>
              </Space>
            }
          >
            <TextArea
              value={prompt}
              onChange={(v) => setPrompt(v)}
              placeholder="描述你想要的商品图片，例如：白色背景上的护肤瓶产品摄影，专业灯光..."
              rows={5}
              showClear
              disabled={isGenerating}
            />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
              <Button
                theme="borderless"
                icon={<Sparkles size={14} />}
                onClick={handleGeneratePrompt}
                disabled={!selectedProduct}
              >
                根据商品生成提示词
              </Button>
              <Text type="tertiary" style={{ fontSize: 12 }}>
                支持中英文，越详细效果越好
              </Text>
            </div>
          </Card>

          <Card
            style={{
              background: "var(--semi-color-bg-2, #334155)",
              border: "1px solid var(--semi-color-border, #475569)",
            }}
            bodyStyle={{ padding: 20 }}
            title={
              <Space>
                <Palette size={16} color="#f59e0b" />
                <span style={{ color: "#f8fafc" }}>生成参数</span>
              </Space>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Text style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>尺寸</Text>
                <Select value={size} onChange={(v) => setSize(v as ImageSize)} style={{ width: "100%" }}>
                  {SIZE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>质量</Text>
                <Select value={quality} onChange={(v) => setQuality(v as ImageQuality)} style={{ width: "100%" }}>
                  {QUALITY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>输出格式</Text>
                <Select
                  value={outputFormat}
                  onChange={(v) => setOutputFormat(v as ImageOutputFormat)}
                  style={{ width: "100%" }}
                >
                  {FORMAT_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>背景</Text>
                <Select
                  value={background}
                  onChange={(v) => setBackground(v as ImageBackground)}
                  style={{ width: "100%" }}
                >
                  {BACKGROUND_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Text style={{ display: "block", marginBottom: 8, color: "#cbd5e1" }}>生成数量</Text>
                <Select value={count} onChange={(v) => setCount(v as number)} style={{ width: "100%" }}>
                  {COUNT_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>

            <Divider margin={16} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space>
                <Coins size={14} color="#f59e0b" />
                <Text type="tertiary" style={{ fontSize: 12 }}>
                  剩余积分: {userStore.points} | 今日免费: {userStore.freeDailyUsed}/{userStore.freeDailyLimit}
                </Text>
              </Space>
              <Button
                theme="solid"
                type="primary"
                icon={<Send size={16} />}
                loading={isGenerating}
                disabled={!prompt.trim() || !canGenerate}
                onClick={handleGenerate}
              >
                {isGenerating ? "生成中..." : `开始生图（${count} 张）`}
              </Button>
            </div>
            {!canGenerate && (
              <Text type="danger" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
                积分不足或今日免费额度已用完，请使用兑换码充值
              </Text>
            )}
          </Card>
        </Col>

        <Col span={14}>
          <Card
            style={{
              background: "var(--semi-color-bg-2, #334155)",
              border: "1px solid var(--semi-color-border, #475569)",
              height: "100%",
            }}
            bodyStyle={{ padding: 20, height: "calc(100% - 46px)", display: "flex", flexDirection: "column" }}
            title={
              <Space>
                <ImageIcon size={16} color="#ec4899" />
                <span style={{ color: "#f8fafc" }}>生成结果</span>
                {isGenerating && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    生成中
                  </Tag>
                )}
                {generatedImages.length > 0 && !isGenerating && (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    已完成 {generatedImages.length} 张
                  </Tag>
                )}
              </Space>
            }
          >
            {isGenerating && generatedImages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                }}
              >
                <Spin size="large" />
                <Text type="tertiary">AI 正在生成 {count} 张图片，请稍候... 正在分批处理</Text>
              </div>
            )}

            {!isGenerating && generatedImages.length === 0 && (
              <Empty
                image={<Images size={64} color="#64748b" />}
                description="输入提示词并点击开始生图"
                style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
              />
            )}

            {generatedImages.length > 0 && (
              <>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Checkbox checked={allSelected} onChange={toggleSelectAll}>
                    全选
                  </Checkbox>
                  <Text type="tertiary" style={{ fontSize: 12 }}>
                    已选择 {selectedImageIds.size} / {generatedImages.length} 张
                  </Text>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    display: "grid",
                    gridTemplateColumns: generatedImages.length <= 2 ? "1fr" : "1fr 1fr",
                    gap: 12,
                    alignContent: "start",
                  }}
                >
                  {generatedImages.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        position: "relative",
                        border: "1px solid var(--semi-color-border, #475569)",
                        borderRadius: 8,
                        padding: 8,
                        background: "var(--semi-color-bg-3, #475569)",
                      }}
                    >
                      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1 }}>
                        <Checkbox
                          checked={selectedImageIds.has(item.id)}
                          onChange={() => toggleSelectImage(item.id)}
                        />
                      </div>
                      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}>
                        <Tag size="small" color="blue">#{index + 1}</Tag>
                      </div>
                      <img
                        src={item.imageUrl}
                        alt={`generated-${index + 1}`}
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: 6,
                          display: "block",
                        }}
                      />
                      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Tooltip content="复制图片链接">
                          <Button
                            size="small"
                            icon={copiedId === item.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            onClick={() => handleCopyUrl(item.imageUrl, item.id)}
                          >
                            {copiedId === item.id ? "已复制" : "复制"}
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>

                <Divider margin={16} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <Space>
                    <Button icon={<FolderOpen size={14} />} onClick={handleSelectSaveDir}>
                      {saveDir ? "更换目录" : "选择保存目录"}
                    </Button>
                    {saveDir && (
                      <Text type="tertiary" style={{ fontSize: 12, maxWidth: 200 }} ellipsis>
                        {saveDir}
                      </Text>
                    )}
                  </Space>
                  <Button
                    theme="solid"
                    type="primary"
                    icon={<ArrowRightLeft size={16} />}
                    loading={saving}
                    disabled={!selectedProduct || selectedImageIds.size === 0}
                    onClick={handleSaveSelectedToProduct}
                  >
                    保存选中到商品（{selectedImageIds.size} 张）
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
