import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Progress,
  Modal,
  Form,
  Select,
  Input,
  Toast,
  Space,
  Popconfirm,
  Descriptions,
  Empty,
} from "@douyinfe/semi-ui";
import {
  Download,
  FileArchive,
  Plus,
  FolderOpen,
  RefreshCw,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useTaskStore } from "../../stores/taskStore";
import { useProductStore } from "../../stores/productStore";
import type { ExportTask } from "../../types";
import { formatDate } from "../../utils/helpers";
import { invoke } from "@tauri-apps/api/core";

const { Title, Text } = Typography;
const { Option } = Select;

const TEMPLATE_OPTIONS = [
  { value: "1688", label: "1688" },
  { value: "alibaba", label: "阿里国际站" },
  { value: "shopify", label: "Shopify" },
  { value: "custom", label: "自定义" },
];

const TEMPLATE_LABEL_MAP: Record<string, string> = {
  "1688": "1688",
  alibaba: "阿里国际站",
  shopify: "Shopify",
  custom: "自定义",
};

interface ExportResult {
  zipPath: string;
  productCount: number;
  imageCount: number;
  videoCount: number;
}

export default function Export() {
  const { tasks, addTask, updateTask, deleteTask, setTaskStatus, setTaskProgress } =
    useTaskStore();
  const { products } = useProductStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<ExportTask | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 新建导出表单状态
  const [taskName, setTaskName] = useState("");
  const [template, setTemplate] = useState<ExportTask["template"]>("1688");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState<string>("");

  const resetForm = useCallback(() => {
    setTaskName("");
    setTemplate("1688");
    setSelectedProductIds([]);
    setOutputDir("");
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await invoke<string | null>("select_folder");
      if (result) {
        setOutputDir(result);
      }
    } catch (err) {
      Toast.error("选择目录失败: " + String(err));
    }
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!taskName.trim()) {
      Toast.warning("请输入任务名称");
      return;
    }
    if (selectedProductIds.length === 0) {
      Toast.warning("请至少选择一个商品");
      return;
    }

    const newTask = addTask({
      name: taskName.trim(),
      template,
      productIds: selectedProductIds,
      outputPath: outputDir || undefined,
    });

    setModalVisible(false);
    resetForm();

    // 开始执行导出
    await executeExport(newTask);
  }, [taskName, template, selectedProductIds, outputDir, addTask, resetForm]);

  const executeExport = useCallback(
    async (task: ExportTask) => {
      setSubmitting(true);
      setTaskStatus(task.id, "processing");
      setTaskProgress(task.id, 10);

      try {
        const result = await invoke<ExportResult>("export_product_package", {
          task: {
            id: task.id,
            name: task.name,
            productIds: task.productIds,
            template: task.template,
            outputDir: task.outputPath,
          },
        });

        setTaskProgress(task.id, 100);
        setTaskStatus(task.id, "completed");
        updateTask(task.id, { outputPath: result.zipPath });

        Toast.success(
          `导出完成: ${result.productCount} 个商品, ${result.imageCount} 张图片, ${result.videoCount} 个视频`
        );
      } catch (err) {
        setTaskStatus(task.id, "failed", String(err));
        Toast.error("导出失败: " + String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [setTaskStatus, setTaskProgress, updateTask]
  );

  const handleRetry = useCallback(
    async (task: ExportTask) => {
      setTaskStatus(task.id, "pending");
      setTaskProgress(task.id, 0);
      await executeExport(task);
    },
    [executeExport, setTaskStatus, setTaskProgress]
  );

  const handleOpenFolder = useCallback(async (task: ExportTask) => {
    if (!task.outputPath) {
      Toast.warning("没有输出路径");
      return;
    }
    try {
      await invoke("show_in_folder", { path: task.outputPath });
    } catch (err) {
      Toast.error("打开目录失败: " + String(err));
    }
  }, []);

  const handleViewDetail = useCallback((task: ExportTask) => {
    setCurrentTask(task);
    setDetailVisible(true);
  }, []);

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAllProducts = useCallback(() => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  }, [products, selectedProductIds.length]);

  const columns = useMemo(
    () => [
      {
        title: "任务名称",
        dataIndex: "name",
        render: (name: string, record: ExportTask) => (
          <Space>
            <Text strong>{name}</Text>
            <Text type="tertiary" style={{ fontSize: 12 }}>
              {formatDate(record.createdAt)}
            </Text>
          </Space>
        ),
      },
      {
        title: "模板",
        dataIndex: "template",
        width: 120,
        render: (t: string) => (
          <Tag color="blue">{TEMPLATE_LABEL_MAP[t] || t.toUpperCase()}</Tag>
        ),
      },
      {
        title: "商品数",
        dataIndex: "productIds",
        width: 80,
        render: (ids: string[]) => ids.length,
      },
      {
        title: "进度",
        dataIndex: "progress",
        width: 180,
        render: (p: number, record: ExportTask) =>
          record.status === "processing" ? (
            <Progress percent={p} showInfo />
          ) : (
            <Text>{p}%</Text>
          ),
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        render: (status: ExportTask["status"]) => {
          const colorMap = {
            pending: "grey",
            processing: "blue",
            completed: "green",
            failed: "red",
          } as const;
          const labelMap = {
            pending: "待处理",
            processing: "进行中",
            completed: "已完成",
            failed: "失败",
          };
          return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
        },
      },
      {
        title: "操作",
        width: 200,
        render: (_: unknown, record: ExportTask) => (
          <Space>
            {record.status === "completed" && (
              <>
                <Button
                  theme="borderless"
                  icon={<Download size={14} />}
                  onClick={() => handleOpenFolder(record)}
                >
                  打开
                </Button>
                <Button
                  theme="borderless"
                  icon={<RefreshCw size={14} />}
                  onClick={() => handleRetry(record)}
                >
                  重新导出
                </Button>
              </>
            )}
            {record.status === "failed" && (
              <Button
                theme="borderless"
                icon={<RefreshCw size={14} />}
                onClick={() => handleRetry(record)}
              >
                重试
              </Button>
            )}
            <Button
              theme="borderless"
              icon={<Eye size={14} />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
            <Popconfirm
              title="确认删除"
              content="删除后不可恢复，是否继续？"
              onConfirm={() => deleteTask(record.id)}
            >
              <Button theme="borderless" icon={<Trash2 size={14} />} type="danger" />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleOpenFolder, handleRetry, handleViewDetail, deleteTask]
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
            导出任务
          </Title>
          <Text type="tertiary">一键导出商品资料包，支持多平台模板</Text>
        </div>
        <Button theme="solid" icon={<Plus size={16} />} onClick={openModal}>
          新建导出
        </Button>
      </div>

      <Card
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <Table
          columns={columns}
          dataSource={tasks}
          pagination={{ pageSize: 10 }}
          empty={
            <div style={{ textAlign: "center", padding: 40 }}>
              <FileArchive size={48} color="#475569" />
              <Text type="tertiary" style={{ display: "block", marginTop: 12 }}>
                暂无导出任务
              </Text>
              <Button
                theme="solid"
                icon={<Plus size={16} />}
                style={{ marginTop: 16 }}
                onClick={openModal}
              >
                新建导出
              </Button>
            </div>
          }
        />
      </Card>

      {/* 新建导出任务弹窗 */}
      <Modal
        title="新建导出任务"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>取消</Button>
            <Button
              theme="solid"
              loading={submitting}
              onClick={handleCreateTask}
              disabled={selectedProductIds.length === 0 || !taskName.trim()}
            >
              开始导出
            </Button>
          </Space>
        }
        width={720}
      >
        <Form layout="vertical">
          <Form.Input
            field="name"
            label="任务名称"
            placeholder="例如：1688商品资料包_202406"
            initValue={taskName}
            onChange={(v) => setTaskName(v)}
            required
          />
          <Form.Select
            field="template"
            label="导出模板"
            initValue={template}
            onChange={(v) => setTemplate(v as ExportTask["template"])}
            style={{ width: "100%" }}
            rules={[{ required: true }]}
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Form.Select>
          <Form.Section text="选择商品">
            <div style={{ marginBottom: 8 }}>
              <Button
                theme="borderless"
                icon={
                  selectedProductIds.length === products.length ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )
                }
                onClick={selectAllProducts}
              >
                全选 ({selectedProductIds.length}/{products.length})
              </Button>
            </div>
            <div
              style={{
                maxHeight: 240,
                overflow: "auto",
                border: "1px solid var(--semi-color-border)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {products.length === 0 ? (
                <Empty description="暂无商品，请先添加商品" />
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "6px 0",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--semi-color-border)",
                    }}
                    onClick={() => toggleProductSelection(p.id)}
                  >
                    <span style={{ marginRight: 8 }}>
                      {selectedProductIds.includes(p.id) ? (
                        <CheckSquare size={16} color="#4f46e5" />
                      ) : (
                        <Square size={16} color="#94a3b8" />
                      )}
                    </span>
                    <Text strong style={{ marginRight: 8 }}>
                      {p.sku}
                    </Text>
                    <Text>{p.name}</Text>
                    <Tag size="small" style={{ marginLeft: "auto" }}>
                      {p.category}
                    </Tag>
                  </div>
                ))
              )}
            </div>
          </Form.Section>
          <Form.Section text="输出目录（可选）">
            <Space style={{ width: "100%" }}>
              <Input
                value={outputDir}
                placeholder="默认使用应用数据目录"
                style={{ width: 400 }}
                disabled
              />
              <Button icon={<FolderOpen size={14} />} onClick={handleSelectFolder}>
                选择目录
              </Button>
              {outputDir && (
                <Button
                  theme="borderless"
                  icon={<X size={14} />}
                  onClick={() => setOutputDir("")}
                />
              )}
            </Space>
            <Text type="tertiary" style={{ fontSize: 12, marginTop: 4 }}>
              不选择则默认保存到应用数据目录下的 exports 文件夹
            </Text>
          </Form.Section>
        </Form>
      </Modal>

      {/* 任务详情弹窗 */}
      <Modal
        title="任务详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          <Button onClick={() => setDetailVisible(false)}>关闭</Button>
        }
        width={560}
      >
        {currentTask && (
          <Descriptions layout="vertical" data={[
            { key: "任务ID", value: currentTask.id },
            { key: "任务名称", value: currentTask.name },
            { key: "导出模板", value: TEMPLATE_LABEL_MAP[currentTask.template] || currentTask.template },
            { key: "商品数量", value: currentTask.productIds.length },
            { key: "状态", value: (
              <Tag color={
                currentTask.status === "completed" ? "green" :
                currentTask.status === "failed" ? "red" :
                currentTask.status === "processing" ? "blue" : "grey"
              }>
                {currentTask.status === "pending" ? "待处理" :
                 currentTask.status === "processing" ? "进行中" :
                 currentTask.status === "completed" ? "已完成" : "失败"}
              </Tag>
            )},
            { key: "进度", value: `${currentTask.progress}%` },
            { key: "输出路径", value: currentTask.outputPath || "-" },
            { key: "创建时间", value: formatDate(currentTask.createdAt) },
            { key: "完成时间", value: currentTask.completedAt ? formatDate(currentTask.completedAt) : "-" },
            ...(currentTask.errorMessage ? [{ key: "错误信息", value: currentTask.errorMessage }] : []),
          ]} />
        )}
      </Modal>
    </div>
  );
}
