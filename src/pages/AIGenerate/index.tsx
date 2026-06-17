import {
  Card,
  Typography,
  Button,
  TextArea,
  Row,
  Col,
  Select,
  Tabs,
  TabPane,
  List,
  Empty,
  Toast,
  Spin,
  Tag,
  Space,
  Tooltip,
  Popconfirm,
  Divider,
  Badge,
} from "@douyinfe/semi-ui";
import {
  Sparkles,
  Wand2,
  Type,
  Image,
  Megaphone,
  Copy,
  Check,
  History,
  Trash2,
  Package,
  Send,
  Lightbulb,
  ArrowRightLeft,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useProductStore } from "../../stores/productStore";
import { useAIHistoryStore } from "../../stores/aiStore";
import {
  generateContent,
  type AIGenerateType,
  type AIResult,
} from "../../services/aiService";
import { formatDate } from "../../utils/helpers";

const { Title, Text } = Typography;

const generateTypeOptions: { value: AIGenerateType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    value: "title",
    label: "标题生成",
    icon: <Type size={18} />,
    color: "#3b82f6",
    desc: "生成中英文商品标题，优化搜索排名",
  },
  {
    value: "description",
    label: "描述生成",
    icon: <Wand2 size={18} />,
    color: "#10b981",
    desc: "自动生成多语言商品详情描述",
  },
  {
    value: "marketing",
    label: "营销文案",
    icon: <Megaphone size={18} />,
    color: "#f59e0b",
    desc: "生成社交媒体推广文案和促销话术",
  },
  {
    value: "imagePrompt",
    label: "生图提示词",
    icon: <Image size={18} />,
    color: "#ec4899",
    desc: "生成 AI 绘画/商品摄影的提示词",
  },
];

export default function AIGenerate() {
  const [generateType, setGenerateType] = useState<AIGenerateType>("title");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");

  const products = useProductStore((s) => s.products);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const history = useAIHistoryStore((s) => s.history);
  const addHistory = useAIHistoryStore((s) => s.addHistory);
  const deleteHistory = useAIHistoryStore((s) => s.deleteHistory);
  const clearHistory = useAIHistoryStore((s) => s.clearHistory);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleGenerate = useCallback(async () => {
    if (!selectedProduct) {
      Toast.warning("请先选择一个关联商品");
      return;
    }
    if (!keywords.trim()) {
      Toast.warning("请输入关键词或提示词");
      return;
    }

    setIsGenerating(true);
    setResult("");
    try {
      const content = await generateContent(generateType, selectedProduct, keywords.trim());
      setResult(content);

      const historyItem: AIResult = {
        content,
        type: generateType,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        keywords: keywords.trim(),
        createdAt: Date.now(),
      };
      addHistory(historyItem);
      Toast.success("生成成功");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      Toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [generateType, selectedProduct, keywords, addHistory]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      Toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Toast.error("复制失败");
    }
  }, [result]);

  const handleApplyToProduct = useCallback(() => {
    if (!selectedProduct || !result) {
      Toast.warning("没有可应用的内容");
      return;
    }
    switch (generateType) {
      case "title": {
        // 取第一行（中文标题）更新到商品名称
        const firstLine = result.split("\n")[0].trim();
        if (firstLine) {
          updateProduct(selectedProduct.id, { name: firstLine.replace(/^高品质|Premium\s*/i, "").replace(/-\s*.*$/, "").trim() });
          Toast.success("标题已应用到商品");
        }
        break;
      }
      case "description": {
        updateProduct(selectedProduct.id, { description: result });
        Toast.success("描述已应用到商品");
        break;
      }
      case "marketing": {
        // 营销文案加入 tags
        const newTags = [...selectedProduct.tags, "营销文案已生成"];
        updateProduct(selectedProduct.id, { tags: newTags });
        Toast.success("营销文案已关联到商品");
        break;
      }
      case "imagePrompt": {
        Toast.info("生图提示词已复制，请在生图工具中使用");
        break;
      }
    }
  }, [selectedProduct, result, generateType, updateProduct]);

  const handleUseHistory = useCallback((item: AIResult) => {
    setGenerateType(item.type);
    setSelectedProductId(item.productId || "");
    setKeywords(item.keywords);
    setResult(item.content);
    setActiveTab("generate");
    Toast.info("已加载历史记录");
  }, []);

  const typeLabel = generateTypeOptions.find((o) => o.value === generateType)?.label || "";

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
          AI 生成
        </Title>
        <Text type="tertiary">智能生成商品标题、描述、营销文案与图片提示词</Text>
      </div>

      <Tabs
        type="line"
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as string)}
        style={{ marginBottom: 16 }}
      >
        <TabPane
          tab={
            <span>
              <Sparkles size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              生成
            </span>
          }
          itemKey="generate"
        >
          <Row gutter={16}>
            {/* 左侧：生成类型 + 商品选择 + 关键词输入 */}
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
                    <Lightbulb size={16} color="#f59e0b" />
                    <span style={{ color: "#f8fafc" }}>生成类型</span>
                  </Space>
                }
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {generateTypeOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onClick={() => setGenerateType(opt.value)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 8,
                        border: `2px solid ${generateType === opt.value ? opt.color : "transparent"}`,
                        background: generateType === opt.value ? `${opt.color}15` : "var(--semi-color-bg-3, #475569)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <Space>
                        <span style={{ color: opt.color }}>{opt.icon}</span>
                        <Text strong style={{ color: "#f8fafc" }}>
                          {opt.label}
                        </Text>
                      </Space>
                      <Text
                        type="tertiary"
                        style={{ display: "block", marginTop: 4, fontSize: 12 }}
                      >
                        {opt.desc}
                      </Text>
                    </div>
                  ))}
                </div>
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
                    <Package size={16} color="#3b82f6" />
                    <span style={{ color: "#f8fafc" }}>关联商品</span>
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
                    <Select.Option key={p.id} value={p.id}>
                      <Space>
                        <span>{p.name}</span>
                        <Tag size="small" type="light">
                          {p.sku}
                        </Tag>
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
                {selectedProduct && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--semi-color-bg-3, #475569)", borderRadius: 6 }}>
                    <Text strong style={{ color: "#f8fafc" }}>{selectedProduct.name}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="tertiary" style={{ fontSize: 12 }}>
                        SKU: {selectedProduct.sku} | 分类: {selectedProduct.category} | 价格: {selectedProduct.price} {selectedProduct.currency}
                      </Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {selectedProduct.tags.slice(0, 4).map((tag) => (
                        <Tag key={tag} size="small" style={{ marginRight: 4 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {products.length === 0 && (
                  <Empty
                    image={<Package size={48} color="#64748b" />}
                    description="暂无商品，请先创建商品"
                    style={{ padding: "20px 0" }}
                  />
                )}
              </Card>

              <Card
                style={{
                  background: "var(--semi-color-bg-2, #334155)",
                  border: "1px solid var(--semi-color-border, #475569)",
                }}
                bodyStyle={{ padding: 20 }}
                title={
                  <Space>
                    <ArrowRightLeft size={16} color="#10b981" />
                    <span style={{ color: "#f8fafc" }}>关键词 / 提示词</span>
                  </Space>
                }
              >
                <TextArea
                  value={keywords}
                  onChange={(v) => setKeywords(v)}
                  placeholder={`请输入${typeLabel}相关的关键词，例如：蜂毒保湿、天然成分、抗衰老...`}
                  rows={4}
                  showClear
                  disabled={isGenerating}
                />
                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>
                    提示：关键词用逗号分隔效果更佳
                  </Text>
                  <Button
                    theme="solid"
                    type="primary"
                    icon={<Send size={16} />}
                    loading={isGenerating}
                    disabled={!selectedProductId || !keywords.trim() || products.length === 0}
                    onClick={handleGenerate}
                  >
                    {isGenerating ? "生成中..." : "开始生成"}
                  </Button>
                </div>
              </Card>
            </Col>

            {/* 右侧：生成结果 */}
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
                    <Sparkles size={16} color="#f59e0b" />
                    <span style={{ color: "#f8fafc" }}>生成结果</span>
                    {isGenerating && (
                      <Badge type="primary" count="生成中" style={{ backgroundColor: "#3b82f6" }} />
                    )}
                    {result && !isGenerating && (
                      <Badge type="success" count="已完成" />
                    )}
                  </Space>
                }
              >
                {isGenerating && !result && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    <Spin size="large" />
                    <Text type="tertiary">AI 正在生成{typeLabel}，请稍候...</Text>
                  </div>
                )}

                {!isGenerating && !result && (
                  <Empty
                    image={<Sparkles size={48} color="#64748b" />}
                    description="选择商品并输入关键词，点击开始生成"
                    style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
                  />
                )}

                {result && (
                  <>
                    <div style={{ flex: 1, overflow: "auto" }}>
                      <div
                        style={{
                          padding: 16,
                          background: "var(--semi-color-bg-3, #475569)",
                          borderRadius: 8,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.7,
                          color: "#f8fafc",
                          fontSize: 14,
                          minHeight: 200,
                        }}
                      >
                        {result}
                      </div>
                    </div>
                    <Divider margin={16} />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <Tooltip content="复制结果">
                        <Button
                          icon={copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                          onClick={handleCopy}
                        >
                          {copied ? "已复制" : "复制"}
                        </Button>
                      </Tooltip>
                      <Tooltip content="将结果应用到当前商品">
                        <Button
                          theme="solid"
                          type="primary"
                          icon={<ArrowRightLeft size={16} />}
                          onClick={handleApplyToProduct}
                          disabled={!selectedProduct}
                        >
                          应用到商品
                        </Button>
                      </Tooltip>
                    </div>
                  </>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={
            <span>
              <History size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              历史记录
              {history.length > 0 && (
                <Badge
                  count={history.length}
                  style={{ marginLeft: 4 }}
                  type={history.length > 10 ? "danger" : "primary"}
                />
              )}
            </span>
          }
          itemKey="history"
        >
          <Card
            style={{
              background: "var(--semi-color-bg-2, #334155)",
              border: "1px solid var(--semi-color-border, #475569)",
            }}
            bodyStyle={{ padding: 20 }}
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space>
                  <History size={16} color="#94a3b8" />
                  <span style={{ color: "#f8fafc" }}>生成历史</span>
                </Space>
                {history.length > 0 && (
                  <Popconfirm
                    title="确认清空所有历史记录？"
                    content="此操作不可撤销"
                    onConfirm={clearHistory}
                  >
                    <Button type="danger" icon={<Trash2 size={14} />} size="small">
                      清空历史
                    </Button>
                  </Popconfirm>
                )}
              </div>
            }
          >
            {history.length === 0 ? (
              <Empty
                image={<History size={48} color="#64748b" />}
                description="暂无生成历史"
                style={{ padding: 40 }}
              />
            ) : (
              <List
                dataSource={history}
                renderItem={(item) => {
                  const typeOpt = generateTypeOptions.find((o) => o.value === item.type);
                  return (
                    <List.Item
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--semi-color-border, #475569)",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onClick={() => handleUseHistory(item)}
                      header={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <Space>
                            <span style={{ color: typeOpt?.color || "#94a3b8" }}>{typeOpt?.icon}</span>
                            <Text strong style={{ color: "#f8fafc" }}>
                              {typeOpt?.label}
                            </Text>
                            {item.productName && (
                              <Tag size="small" type="light">
                                {item.productName}
                              </Tag>
                            )}
                          </Space>
                          <Text type="tertiary" style={{ fontSize: 12 }}>
                            {formatDate(item.createdAt)}
                          </Text>
                        </div>
                      }
                      main={
                        <div>
                          <Text type="tertiary" style={{ fontSize: 12, marginBottom: 4, display: "block" }}>
                            关键词: {item.keywords}
                          </Text>
                          <Text
                            style={{
                              color: "#cbd5e1",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.content}
                          </Text>
                        </div>
                      }
                      extra={
                        <Popconfirm
                          title="删除这条记录？"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            deleteHistory(item.createdAt);
                            Toast.success("已删除");
                          }}
                        >
                          <Button
                            type="danger"
                            theme="borderless"
                            icon={<Trash2 size={14} />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      }
                    />
                  );
                }}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}
