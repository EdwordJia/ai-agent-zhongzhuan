import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  SideSheet,
  Button,
  TextArea,
  Avatar,
  Spin,
  Typography,
  Tag,
  Space,
  Popconfirm,
  Toast,
} from "@douyinfe/semi-ui";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { getChatResponse } from "../../services/chatService";

const { Text } = Typography;

export default function ChatBox() {
  const navigate = useNavigate();
  const {
    isOpen,
    setOpen,
    toggleOpen,
    messages,
    input,
    setInput,
    addMessage,
    appendAssistant,
    isLoading,
    setLoading,
    clearMessages,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      // 使用 setTimeout 确保在动画渲染后滚动
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    addMessage({ role: "user", content: text });
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      const response = await getChatResponse(text, history);
      appendAssistant(response.content, response.action);
    } catch (err) {
      appendAssistant(
        "抱歉，智能体处理出错了，请稍后再试。",
        undefined
      );
    }
  }, [input, isLoading, messages, addMessage, setInput, setLoading, appendAssistant]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAction = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate, setOpen]
  );

  const handleQuickSend = useCallback(
    (text: string) => {
      setInput(text);
      addMessage({ role: "user", content: text });
      setInput("");
      setLoading(true);
      const history = messages
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));
      getChatResponse(text, history)
        .then((response) => appendAssistant(response.content, response.action))
        .catch(() => appendAssistant("抱歉，智能体处理出错了，请稍后再试。"));
    },
    [messages, addMessage, setInput, setLoading, appendAssistant]
  );

  return (
    <>
      {/* 浮动按钮 */}
      <Button
        theme="solid"
        type="primary"
        aria-label="打开聊天"
        icon={<MessageSquare size={24} />}
        onClick={toggleOpen}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
          padding: 0,
        }}
      />

      <SideSheet
        className="openclaw-chat-sidesheet"
        title={
          <Space>
            <Avatar size="small" style={{ background: "#3b82f6" }}>
              <Bot size={16} />
            </Avatar>
            <Text strong style={{ color: "var(--semi-color-text-0)" }}>
              OpenClaw 智能体
            </Text>
          </Space>
        }
        visible={isOpen}
        onCancel={() => setOpen(false)}
        placement="right"
        width={420}
        mask={false}
        footer={null}
        bodyStyle={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 56px)",
          background: "var(--semi-color-bg-1, #1e293b)",
        }}
        headerStyle={{
          background: "var(--semi-color-bg-2, #334155)",
          borderBottom: "1px solid var(--semi-color-border, #475569)",
        }}
        closeIcon={<X size={18} color="#94a3b8" />}
      >
        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "16px 16px 8px",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 16,
              }}
            >
              {msg.role === "assistant" && (
                <Avatar size="small" style={{ background: "#3b82f6", marginRight: 10, flexShrink: 0 }}>
                  <Bot size={14} />
                </Avatar>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background:
                    msg.role === "user"
                      ? "var(--semi-color-primary, #3b82f6)"
                      : "var(--semi-color-bg-3, #475569)",
                  color: msg.role === "user" ? "#fff" : "var(--semi-color-text-0)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                  fontSize: 14,
                }}
              >
                {msg.content}
                {msg.action && (
                  <div style={{ marginTop: 10 }}>
                    <Tag
                      color="blue"
                      style={{ cursor: "pointer" }}
                      onClick={() => handleAction(msg.action!.path)}
                    >
                      <Sparkles size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {msg.action.label}
                    </Tag>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <Avatar size="small" style={{ background: "#10b981", marginLeft: 10, flexShrink: 0 }}>
                  <User size={14} />
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Avatar size="small" style={{ background: "#3b82f6" }}>
                <Bot size={14} />
              </Avatar>
              <Spin size="small" />
              <Text type="tertiary" style={{ fontSize: 12 }}>思考中...</Text>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 快捷问题 */}
        <div
          style={{
            padding: "0 16px 8px",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {["帮我创建商品", "生成营销文案", "打开图片处理", "去导出任务"].map((q) => (
            <Tag
              key={q}
              color="grey"
              style={{ cursor: "pointer" }}
              onClick={() => handleQuickSend(q)}
            >
              {q}
            </Tag>
          ))}
        </div>

        {/* 输入区 */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid var(--semi-color-border, #475569)",
            background: "var(--semi-color-bg-2, #334155)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <TextArea
              value={input}
              onChange={(v: string) => setInput(v)}
              onKeyDown={handleKeyDown}
              placeholder="输入问题，按 Enter 发送..."
              rows={2}
              style={{ flex: 1, resize: "none" }}
              disabled={isLoading}
              showClear
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button
                theme="solid"
                type="primary"
                icon={<Send size={16} />}
                disabled={!input.trim() || isLoading}
                onClick={handleSend}
              />
              <Popconfirm
                title="清空会话"
                content="确定要清空当前会话吗？"
                onConfirm={() => {
                  clearMessages();
                  Toast.success("会话已清空");
                }}
              >
                <Button icon={<Trash2 size={16} />} type="tertiary" />
              </Popconfirm>
            </div>
          </div>
          <Text type="tertiary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
            提示：智能体通过 LLM 调用 OpenClaw 的商品管理、AI 生成、生图、图片处理和导出任务等功能。
          </Text>
        </div>
      </SideSheet>
    </>
  );
}
