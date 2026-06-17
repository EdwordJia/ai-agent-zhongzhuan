import { createMcpAgentClient, listMcpTools, callMcpTool } from "../mcp/client.js";
import { getAIConfig } from "./aiService.js";

export interface AgentResponse {
  content: string;
  action?: {
    label: string;
    path: string;
  };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

const SYSTEM_PROMPT = `你是 OpenClaw 跨境电商智能体，可以通过 MCP 工具调用本应用的商品管理、AI 文案/图片生成、图片批量处理、导出任务等功能。如果用户请求需要操作数据，请调用对应工具。工具结果中的成功/失败信息请用中文简洁地回复用户。`;

const MAX_TOOL_ROUNDS = 6;

export async function getAgentResponse(
  input: string,
  history: { role: "user" | "assistant" | "system"; content: string }[]
): Promise<AgentResponse> {
  const config = getAIConfig();
  if (!config.apiKey.trim()) {
    throw new Error("未配置 AI API Key");
  }

  const { client, close } = await createMcpAgentClient();

  try {
    const toolsList = await listMcpTools(client);
    const tools: OpenAITool[] = toolsList.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema || { type: "object", properties: {} },
      },
    }));

    const messages: OpenAIMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: input },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch(`${config.apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: config.temperature,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { content: `调用 LLM 失败：${errorText}` };
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type: "function";
              function: {
                name: string;
                arguments: string;
              };
            }>;
          };
        }>;
      };

      const assistantMessage = data.choices?.[0]?.message;
      if (!assistantMessage) {
        return { content: "LLM 返回空响应" };
      }

      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        const content = assistantMessage.content || "";
        if (!content.trim()) {
          return { content: "智能体已处理完毕，但没有返回具体内容。" };
        }
        return { content };
      }

      // 把 assistant 的消息（含 tool_calls）加入 messages
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: toolCalls,
      });

      // 逐个调用 tool
      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        const result = await callMcpTool(client, toolCall.function.name, args);
        const toolResultText = result.content[0]?.text || "";
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultText,
        });
      }
    }

    // 达到最大轮次，返回友好提示
    return {
      content: "智能体已尽力处理，但工具调用轮次已达上限，请简化需求或分步操作。",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: `智能体处理出错：${message}` };
  } finally {
    await close();
  }
}
