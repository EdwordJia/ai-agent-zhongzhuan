import { getAIConfig } from "./aiService";
import { getAgentResponse } from "./agentService";

export interface ChatResponse {
  content: string;
  action?: {
    label: string;
    path: string;
  };
}

export async function getChatResponse(
  input: string,
  history?: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<ChatResponse> {
  const config = getAIConfig();
  if (!config.apiKey.trim()) {
    return {
      content:
        "尚未配置 AI API Key，请前往设置页面配置 LLM 服务后再使用智能体聊天。",
      action: { label: "打开设置", path: "/settings" },
    };
  }

  try {
    const agentResponse = await getAgentResponse(input, history || []);
    return {
      content: agentResponse.content,
      action: agentResponse.action,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: `智能体调用失败：${msg}` };
  }
}

