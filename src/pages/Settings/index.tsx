import { Card, Typography, Button, Form, Select, Toast } from "@douyinfe/semi-ui";
import { Save, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { getAIConfig, saveAIConfig, type AIConfig } from "../../services/aiService";
import {
  getImageGenerationConfig,
  saveImageGenerationConfig,
  type ImageGenerationConfig,
} from "../../services/imageGenerationService";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [version, setVersion] = useState("0.1.0");
  const [aiConfig, setAIConfig] = useState<AIConfig>(getAIConfig());
  const [imageConfig, setImageConfig] = useState<ImageGenerationConfig>(getImageGenerationConfig());
  const [formKey, setFormKey] = useState(0); // 用于强制刷新表单
  const [imageFormKey, setImageFormKey] = useState(0);

  useEffect(() => {
    invoke<string>("get_app_version")
      .then((v) => setVersion(v))
      .catch(() => setVersion("0.1.0"));
  }, []);

  // 加载保存的 AI 配置
  useEffect(() => {
    const saved = getAIConfig();
    setAIConfig(saved);
    setFormKey((k) => k + 1);

    const savedImage = getImageGenerationConfig();
    setImageConfig(savedImage);
    setImageFormKey((k) => k + 1);
  }, []);

  const handleSaveGeneral = (values: Record<string, unknown>) => {
    console.log("保存通用设置:", values);
    Toast.success("通用设置已保存");
  };

  const handleSaveAI = (values: Record<string, unknown>) => {
    const config: AIConfig = {
      provider: (values.aiProvider as AIConfig["provider"]) || "deepseek",
      apiKey: (values.apiKey as string) || "",
      apiBase: (values.apiBase as string) || "",
      model: (values.model as string) || "",
      temperature: (values.temperature as number) ?? 0.7,
    };
    saveAIConfig(config);
    setAIConfig(config);
    Toast.success("AI 配置已保存到 localStorage");
  };

  const handleSaveImageGeneration = (values: Record<string, unknown>) => {
    const config: ImageGenerationConfig = {
      gatewayUrl: (values.gatewayUrl as string) || "https://www.fhl.mom/",
      apiKey: (values.imageApiKey as string) || "",
      model: (values.imageModel as string) || "gpt-image-2",
    };
    saveImageGenerationConfig(config);
    setImageConfig(config);
    Toast.success("AI 生图配置已保存");
  };

  const handleOpenDocs = () => {
    invoke("open_external_url", { url: "https://tauri.app" }).catch(console.error);
  };

  const providerModels: Record<AIConfig["provider"], string[]> = {
    openai: ["gpt-5.5", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    ollama: ["llama3", "llama3.1", "qwen2.5", "mistral", "gemma2"],
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
          设置
        </Title>
        <Text type="tertiary">配置应用参数与 API 连接</Text>
      </div>

      <Card
        title="通用设置"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        <Form
          labelPosition="left"
          labelAlign="right"
          labelWidth={120}
          onSubmit={handleSaveGeneral}
          render={() => (
            <>
              <Form.Select
                field="theme"
                label="主题模式"
                initValue="dark"
                style={{ width: 200 }}
              >
                <Select.Option value="dark">深色模式</Select.Option>
                <Select.Option value="light">浅色模式</Select.Option>
                <Select.Option value="auto">跟随系统</Select.Option>
              </Form.Select>
              <Form.Input
                field="exportPath"
                label="默认导出目录"
                placeholder="选择导出文件夹路径"
              />
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <Button onClick={handleOpenDocs} icon={<ExternalLink size={16} />}>
                  文档
                </Button>
                <Button theme="solid" icon={<Save size={16} />} htmlType="submit">
                  保存设置
                </Button>
              </div>
            </>
          )}
        />
      </Card>

      <Card
        title="AI 服务配置"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        {/* 注意：当前使用浏览器 localStorage 持久化，后续可迁移到 tauri-plugin-store */}
        <Form
          key={formKey}
          labelPosition="left"
          labelAlign="right"
          labelWidth={120}
          onSubmit={handleSaveAI}
          initValues={{
            aiProvider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            apiBase: aiConfig.apiBase,
            model: aiConfig.model,
            temperature: aiConfig.temperature,
          }}
          render={({ formState }) => {
            const provider = (formState.values.aiProvider as AIConfig["provider"]) || "deepseek";
            const models = providerModels[provider] || [];
            const currentModel = formState.values.model as string;
            const modelValid = models.includes(currentModel);

            return (
              <>
                <Form.Select
                  field="aiProvider"
                  label="AI 提供商"
                  style={{ width: 200 }}
                  onChange={() => {
                    // 切换提供商时重置模型
                    const newModels = providerModels[provider] || [];
                    if (newModels.length > 0) {
                      formState.values.model = newModels[0];
                    }
                  }}
                >
                  <Select.Option value="openai">OpenAI</Select.Option>
                  <Select.Option value="deepseek">DeepSeek</Select.Option>
                  <Select.Option value="ollama">Ollama (本地)</Select.Option>
                </Form.Select>

                <Form.Input
                  field="apiKey"
                  label="API Key"
                  type="password"
                  placeholder="sk-..."
                />

                <Form.Input
                  field="apiBase"
                  label="API 基础地址"
                  placeholder={
                    provider === "openai"
                      ? "https://api.openai.com/v1"
                      : provider === "deepseek"
                      ? "https://api.deepseek.com/v1"
                      : "http://localhost:11434/v1"
                  }
                />

                <Form.Select
                  field="model"
                  label="模型"
                  style={{ width: 240 }}
                  placeholder="选择模型"
                  optionList={models.map((m) => ({ label: m, value: m }))}
                  initValue={modelValid ? currentModel : models[0]}
                />

                <Form.InputNumber
                  field="temperature"
                  label="Temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  style={{ width: 120 }}
                  initValue={0.7}
                />

                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "var(--semi-color-bg-3, #475569)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#94a3b8",
                  }}
                >
                  提示：当前配置保存在浏览器 localStorage 中。如需 Tauri 原生持久化，后续可接入 tauri-plugin-store。
                </div>

                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <Button onClick={handleOpenDocs} icon={<ExternalLink size={16} />}>
                    文档
                  </Button>
                  <Button theme="solid" type="primary" icon={<Save size={16} />} htmlType="submit">
                    保存 AI 配置
                  </Button>
                </div>
              </>
            );
          }}
        />
      </Card>

      <Card
        title="AI 生图配置"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
          marginTop: 16,
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        <Form
          key={imageFormKey}
          labelPosition="left"
          labelAlign="right"
          labelWidth={120}
          onSubmit={handleSaveImageGeneration}
          initValues={{
            gatewayUrl: imageConfig.gatewayUrl,
            imageApiKey: imageConfig.apiKey,
            imageModel: imageConfig.model,
          }}
        >
          <Form.Input
            field="gatewayUrl"
            label="网关地址"
            placeholder="https://www.fhl.mom/"
            style={{ width: 320 }}
          />
          <Form.Input
            field="imageApiKey"
            label="API Key"
            type="password"
            placeholder="输入 Image Gateway API Key"
            style={{ width: 320 }}
          />
          <Form.Input
            field="imageModel"
            label="模型"
            placeholder="gpt-image-2"
            style={{ width: 240 }}
          />
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              background: "var(--semi-color-bg-3, #475569)",
              borderRadius: 6,
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            提示：GPT Image2 默认使用与文本 LLM 相同的网关地址和 API Key，模型为 gpt-image-2。如需单独配置可覆盖此处。
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button onClick={handleOpenDocs} icon={<ExternalLink size={16} />}>
              文档
            </Button>
            <Button theme="solid" type="primary" icon={<Save size={16} />} htmlType="submit">
              保存生图配置
            </Button>
          </div>
        </Form>
      </Card>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Text type="tertiary">OpenClaw 智能体 v{version}</Text>
      </div>
    </div>
  );
}
