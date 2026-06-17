import { Card, Typography, Button, Table, Tag, Input, Space, Spin, Select } from "@douyinfe/semi-ui";
import { Plus, Search, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../../stores/productStore";
import { useEffect, useMemo } from "react";
import { formatDate } from "../../utils/helpers";
import type { Product } from "../../types";

const { Title, Text } = Typography;

export default function ProductList() {
  const navigate = useNavigate();
  const { products, filter, setFilter, deleteProduct, setCurrentProduct, loadProducts, isLoading } =
    useProductStore();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = products.filter((p) => {
    const matchKeyword =
      !filter.keyword ||
      p.name.toLowerCase().includes(filter.keyword.toLowerCase()) ||
      p.sku.toLowerCase().includes(filter.keyword.toLowerCase());
    const matchStatus =
      filter.status === "all" || p.status === filter.status;
    return matchKeyword && matchStatus;
  });

  const columns = useMemo(
    () => [
      {
        title: "货号",
        dataIndex: "sku",
        width: 160,
      },
      {
        title: "商品名称",
        dataIndex: "name",
        render: (_: unknown, record: Product) => (
          <Text strong style={{ color: "#f8fafc" }}>
            {record.name}
          </Text>
        ),
      },
      {
        title: "分类",
        dataIndex: "category",
        width: 120,
        render: (category: string) => category || "-",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        render: (status: Product["status"]) => {
          const colorMap = {
            draft: "grey",
            active: "green",
            archived: "red",
          } as const;
          const labelMap = {
            draft: "草稿",
            active: "上架",
            archived: "归档",
          };
          return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
        },
      },
      {
        title: "价格",
        dataIndex: "price",
        width: 120,
        render: (price: number, record: Product) =>
          `${record.currency} ${price.toFixed(2)}`,
      },
      {
        title: "图片",
        dataIndex: "images",
        width: 80,
        render: (images: Product["images"]) => (
          <Text type="tertiary">{images?.length || 0} 张</Text>
        ),
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        width: 160,
        render: (ts: number) => formatDate(ts),
      },
      {
        title: "操作",
        width: 140,
        render: (_: unknown, record: Product) => (
          <Space>
            <Button
              theme="borderless"
              size="small"
              onClick={() => {
                setCurrentProduct(record);
                navigate(`/products/${record.id}`);
              }}
            >
              编辑
            </Button>
            <Button
              theme="borderless"
              type="danger"
              size="small"
              onClick={() => deleteProduct(record.id)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [navigate, setCurrentProduct, deleteProduct]
  );

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
            商品管理
          </Title>
          <Text type="tertiary">管理您的跨境电商商品资料</Text>
        </div>
        <Button
          theme="solid"
          icon={<Plus size={16} />}
          onClick={() => navigate("/products/new")}
        >
          新建商品
        </Button>
      </div>

      <Card
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
          <Input
            prefix={<Search size={16} />}
            placeholder="搜索货号或商品名称"
            value={filter.keyword}
            onChange={(v) => setFilter({ keyword: v })}
            style={{ width: 280 }}
          />
          <Select
            value={filter.status}
            onChange={(v) => setFilter({ status: v as Product["status"] | "all" })}
            style={{ width: 120 }}
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="draft">草稿</Select.Option>
            <Select.Option value="active">上架</Select.Option>
            <Select.Option value="archived">归档</Select.Option>
          </Select>
        </div>

        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 10 }}
            empty={
              <div style={{ textAlign: "center", padding: 40 }}>
                <Package size={48} color="#475569" />
                <Text type="tertiary" style={{ display: "block", marginTop: 12 }}>
                  暂无商品数据
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
            }
          />
        </Spin>
      </Card>
    </div>
  );
}
