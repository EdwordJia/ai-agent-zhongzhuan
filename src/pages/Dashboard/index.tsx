import { Card, Typography, Row, Col, Button } from "@douyinfe/semi-ui";
import { Plus, Package, Image, Sparkles, Download } from "lucide-react";
import { useProductStore } from "../../stores/productStore";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { products } = useProductStore();

  const stats: StatItem[] = [
    {
      label: "商品总数",
      value: products.length,
      icon: <Package size={20} color="#3b82f6" />,
      color: "#3b82f6",
    },
    {
      label: "素材图片",
      value: products.reduce((sum, p) => sum + p.images.length, 0),
      icon: <Image size={20} color="#10b981" />,
      color: "#10b981",
    },
    {
      label: "AI 任务",
      value: 0,
      icon: <Sparkles size={20} color="#f59e0b" />,
      color: "#f59e0b",
    },
    {
      label: "导出任务",
      value: 0,
      icon: <Download size={20} color="#8b5cf6" />,
      color: "#8b5cf6",
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
            仪表盘
          </Title>
          <Text type="tertiary">概览您的商品与任务状态</Text>
        </div>
        <Button
          theme="solid"
          icon={<Plus size={16} />}
          onClick={() => navigate("/products/new")}
        >
          新建商品
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {stats.map((s) => (
          <Col span={6} key={s.label}>
            <Card
              style={{
                background: "var(--semi-color-bg-2, #334155)",
                border: "1px solid var(--semi-color-border, #475569)",
              }}
              bodyStyle={{ padding: "20px 24px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${s.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "#f8fafc" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="最近商品"
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
        }}
      >
        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Package size={48} color="#475569" />
            <Text type="tertiary" style={{ display: "block", marginTop: 12 }}>
              暂无商品，点击上方按钮创建
            </Text>
            <Button
              theme="solid"
              icon={<Plus size={16} />}
              style={{ marginTop: 16 }}
              onClick={() => navigate("/products/new")}
            >
              新建商品
            </Button>
          </div>
        ) : (
          <Text>商品列表占位，后续接入表格组件</Text>
        )}
      </Card>
    </div>
  );
}
