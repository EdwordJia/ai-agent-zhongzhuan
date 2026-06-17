import { Card, Typography, Button, Form, Select, Toast, Input } from "@douyinfe/semi-ui";
import { Save, ExternalLink, RefreshCw, Gift } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { useUserStore } from "../../stores/userStore";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [version, setVersion] = useState("0.1.0");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const userStore = useUserStore();

  useEffect(() => {
    invoke<string>("get_app_version")
      .then((v) => setVersion(v))
      .catch(() => setVersion("0.1.0"));
  }, []);

  const handleSaveGeneral = (values: Record<string, unknown>) => {
    console.log("保存通用设置:", values);
    Toast.success("通用设置已保存");
  };

  const handleOpenDocs = () => {
    invoke("open_external_url", { url: "https://tauri.app" }).catch(console.error);
  };

  const handleRefreshPoints = async () => {
    await userStore.refreshPoints();
    Toast.success("积分已刷新");
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      Toast.warning("请输入兑换码");
      return;
    }
    setRedeeming(true);
    const success = await userStore.redeemCode(redeemCode.trim());
    if (success) {
      setRedeemCode("");
    }
    setRedeeming(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
          设置
        </Title>
        <Text type="tertiary">配置应用参数与账户信息</Text>
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
        title="账户信息"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#cbd5e1" }}>设备 ID</Text>
            <Text
              type="tertiary"
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                maxWidth: 300,
              }}
              ellipsis={{ showTooltip: true }}
            >
              {userStore.machineId || "未初始化"}
            </Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#cbd5e1" }}>剩余积分</Text>
            <Text strong style={{ color: "#f8fafc", fontSize: 18 }}>
              {userStore.points}
            </Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#cbd5e1" }}>今日免费使用</Text>
            <Text style={{ color: "#f8fafc" }}>
              {userStore.freeDailyUsed} / {userStore.freeDailyLimit} 次
            </Text>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button
              icon={<RefreshCw size={16} />}
              onClick={handleRefreshPoints}
              loading={userStore.isLoading}
            >
              刷新积分
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title="兑换码"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Input
            value={redeemCode}
            onChange={(v) => setRedeemCode(v)}
            placeholder="输入兑换码"
            style={{ flex: 1 }}
            showClear
          />
          <Button
            theme="solid"
            type="primary"
            icon={<Gift size={16} />}
            loading={redeeming}
            onClick={handleRedeem}
          >
            兑换
          </Button>
        </div>
        <Text type="tertiary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
          输入有效兑换码可充值积分，继续使用 AI 生图功能
        </Text>
      </Card>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Text type="tertiary">OpenClaw 智能体 v{version}</Text>
      </div>
    </div>
  );
}
