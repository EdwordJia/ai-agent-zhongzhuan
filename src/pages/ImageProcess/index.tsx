import { useState, useCallback, useRef, useMemo } from "react";
import {
  Card,
  Typography,
  Button,
  Table,
  Checkbox,
  Slider,
  Select,
  InputNumber,
  Input,
  Progress,
  Tag,
  Space,
  Empty,
  Toast,
  Modal,
  Form,
  Switch,
  Descriptions,
} from "@douyinfe/semi-ui";
import {
  Image,
  FolderOpen,
  Trash2,
  Play,
  Square,
  CheckSquare,
  Settings,
  FileImage,
  FolderOutput,
  RotateCcw,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useImageProcessStore } from "../../stores/imageProcessStore";
import {
  formatFileSize,
  generateId,
  getFileNameWithoutExt,
  getFileExt,
  processImageWithCanvas,
  generateRenamedFileName,
} from "../../utils/helpers";
import type { ImageItem, ImageProcessTask, ImageFormat } from "../../types";

const { Title, Text } = Typography;
const { Option } = Select;

/** 将文件路径转为可显示的缩略图 URL */
async function pathToThumbnailUrl(filePath: string): Promise<string> {
  try {
    const { readFile } = await import("@tauri-apps/plugin-fs" as any);
    const uint8Array = await readFile(filePath);
    const bytes = Array.from(uint8Array as Uint8Array);
    const binary = bytes.map((b: number) => String.fromCharCode(b)).join("");
    const base64 = btoa(binary);
    const ext = getFileExt(filePath);
    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return "";
  }
}

/** 获取图片尺寸 */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

/** 获取文件大小（通过 Tauri fs 读取） */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const { readFile } = await import("@tauri-apps/plugin-fs" as any);
    const uint8Array = await readFile(filePath);
    return (uint8Array as Uint8Array).length;
  } catch {
    return 0;
  }
}

export default function ImageProcess() {
  const store = useImageProcessStore();
  const {
    images,
    tasks,
    settings,
    isProcessing,
    addImages,
    removeImage,
    clearImages,
    toggleSelectImage,
    selectAllImages,
    getSelectedImages,
    addTasks,
    updateTaskStatus,
    clearTasks,
    setSettings,
    setOutputDir,
    toggleOperation,
    setTargetFormat,
    setQuality,
    setTargetSize,
    setRenamePattern,
    setIsProcessing,
    setCurrentTaskId,
  } = store;

  const [loadingImages, setLoadingImages] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);
  const abortRef = useRef(false);

  const selectedImages = getSelectedImages();
  const allSelected = images.length > 0 && images.every((img) => img.selected);
  const hasSelected = selectedImages.length > 0;

  /** 选择文件夹并加载图片 */
  const handleSelectFolder = useCallback(async () => {
    try {
      const folderPath = await invoke<string | null>("select_folder");
      if (!folderPath) return;

      setLoadingImages(true);
      const filePaths = await invoke<string[]>("read_image_dir", { path: folderPath });

      if (filePaths.length === 0) {
        Toast.info("该文件夹中没有找到图片文件");
        setLoadingImages(false);
        return;
      }

      const newImages: ImageItem[] = [];
      for (const filePath of filePaths) {
        const fileName = filePath.split(/[\\/]/).pop() || "";
        const thumbnailUrl = await pathToThumbnailUrl(filePath);
        const fileSize = await getFileSize(filePath);
        const dimensions = thumbnailUrl
          ? await getImageDimensions(thumbnailUrl)
          : { width: 0, height: 0 };

        newImages.push({
          id: generateId(),
          filePath,
          fileName,
          fileSize,
          width: dimensions.width,
          height: dimensions.height,
          format: getFileExt(filePath),
          thumbnailUrl,
          selected: true,
        });
      }

      addImages(newImages);
      Toast.success(`已加载 ${newImages.length} 张图片`);
    } catch (err) {
      Toast.error(`加载图片失败: ${err}`);
    } finally {
      setLoadingImages(false);
    }
  }, [addImages]);

  /** 选择输出目录 */
  const handleSelectOutputDir = useCallback(async () => {
    try {
      const folderPath = await invoke<string | null>("select_folder");
      if (folderPath) {
        setOutputDir(folderPath);
        Toast.success("已设置输出目录");
      }
    } catch (err) {
      Toast.error(`选择目录失败: ${err}`);
    }
  }, [setOutputDir]);

  /** 开始批量处理 */
  const handleStartProcess = useCallback(async () => {
    if (selectedImages.length === 0) {
      Toast.warning("请先选择要处理的图片");
      return;
    }
    if (!settings.outputDir) {
      Toast.warning("请先设置输出目录");
      setShowSettings(true);
      return;
    }

    abortRef.current = false;
    setIsProcessing(true);
    clearTasks();

    // 创建任务列表
    const newTasks: ImageProcessTask[] = selectedImages.map((img) => ({
      id: generateId(),
      imageId: img.id,
      fileName: img.fileName,
      status: "pending",
      progress: 0,
    }));
    addTasks(newTasks);

    // 确保输出目录存在
    try {
      await invoke("ensure_dir", { path: settings.outputDir });
    } catch (err) {
      Toast.error(`创建输出目录失败: ${err}`);
      setIsProcessing(false);
      return;
    }

    // 逐个处理
    for (let i = 0; i < newTasks.length; i++) {
      if (abortRef.current) break;

      const task = newTasks[i];
      const image = selectedImages.find((img) => img.id === task.imageId);
      if (!image) continue;

      setCurrentTaskId(task.id);
      updateTaskStatus(task.id, "processing", 10);

      try {
        updateTaskStatus(task.id, "processing", 30);

        // 读取原图数据
        const { readFile } = await import("@tauri-apps/plugin-fs" as any);
        const uint8Array = await readFile(image.filePath);
        const bytes = Array.from(uint8Array as Uint8Array);
        const binary = bytes.map((b: number) => String.fromCharCode(b)).join("");
        const base64 = btoa(binary);
        const ext = getFileExt(image.filePath);
        const mimeType =
          ext === "png"
            ? "image/png"
            : ext === "webp"
              ? "image/webp"
              : ext === "gif"
                ? "image/gif"
                : "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64}`;

        updateTaskStatus(task.id, "processing", 50);

        // 确定目标格式
        const targetFormat = settings.operations.includes("convert")
          ? settings.targetFormat
          : ext;
        const mimeTypeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        };
        const targetMimeType = mimeTypeMap[targetFormat] || "image/jpeg";

        // 使用 Canvas 处理图片
        const processOptions = {
          targetWidth: settings.targetWidth,
          targetHeight: settings.targetHeight,
          maintainAspectRatio: settings.maintainAspectRatio,
          quality: settings.quality,
          targetFormat: targetMimeType,
        };

        const result = await processImageWithCanvas(dataUrl, processOptions);

        updateTaskStatus(task.id, "processing", 80);

        // 生成输出文件名
        const idx = i;
        const outputFileName = settings.operations.includes("rename")
          ? generateRenamedFileName(
              image.fileName,
              settings.renamePattern || "{name}_{index}",
              idx,
              settings.targetFormat
            )
          : `${getFileNameWithoutExt(image.fileName)}_processed.${settings.targetFormat === "jpeg" ? "jpg" : settings.targetFormat}`;

        const outputPath = `${settings.outputDir}/${outputFileName}`;

        // 保存文件
        await invoke("save_image_file", {
          base64Data: result.dataUrl,
          outputPath,
        });

        updateTaskStatus(task.id, "completed", 100, outputPath, result.blobSize);
      } catch (err) {
        updateTaskStatus(
          task.id,
          "failed",
          0,
          undefined,
          undefined,
          String(err)
        );
      }
    }

    setCurrentTaskId(null);
    setIsProcessing(false);

    const completedCount = newTasks.filter((t) => t.status === "completed").length;
    const failedCount = newTasks.filter((t) => t.status === "failed").length;

    if (completedCount > 0) {
      Toast.success(`处理完成: ${completedCount} 张成功${failedCount > 0 ? `, ${failedCount} 张失败` : ""}`);
    } else {
      Toast.error("所有图片处理失败");
    }
  }, [selectedImages, settings, clearTasks, addTasks, setCurrentTaskId, updateTaskStatus, setIsProcessing]);

  /** 停止处理 */
  const handleStopProcess = useCallback(() => {
    abortRef.current = true;
    setIsProcessing(false);
    setCurrentTaskId(null);
    Toast.info("已停止处理");
  }, [setIsProcessing, setCurrentTaskId]);

  /** 清空所有 */
  const handleClearAll = useCallback(() => {
    Modal.confirm({
      title: "确认清空",
      content: "确定要清空所有图片和任务吗？",
      onOk: () => {
        clearImages();
        clearTasks();
        Toast.success("已清空");
      },
    });
  }, [clearImages, clearTasks]);

  /** 表格列定义 */
  const columns = useMemo(
    () => [
      {
        title: (
          <Checkbox
            checked={allSelected}
            indeterminate={hasSelected && !allSelected}
            onChange={(e) => selectAllImages(e.target.checked ?? false)}
          />
        ),
        width: 60,
        render: (_: unknown, record: ImageItem) => (
          <Checkbox
            checked={record.selected}
            onChange={() => toggleSelectImage(record.id)}
          />
        ),
      },
      {
        title: "预览",
        width: 100,
        render: (_: unknown, record: ImageItem) => (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              overflow: "hidden",
              background: "#1e293b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setPreviewImage(record)}
          >
            {record.thumbnailUrl ? (
              <img
                src={record.thumbnailUrl}
                alt={record.fileName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <FileImage size={32} color="#475569" />
            )}
          </div>
        ),
      },
      {
        title: "文件名",
        dataIndex: "fileName",
        render: (fileName: string, record: ImageItem) => (
          <div>
            <Text strong style={{ color: "#f8fafc" }}>
              {fileName}
            </Text>
            <div style={{ marginTop: 4 }}>
              <Tag size="small">{record.format.toUpperCase()}</Tag>
              <Text type="tertiary" style={{ marginLeft: 8 }}>
                {record.width} x {record.height}
              </Text>
            </div>
          </div>
        ),
      },
      {
        title: "大小",
        width: 120,
        render: (_: unknown, record: ImageItem) => (
          <Text>{formatFileSize(record.fileSize)}</Text>
        ),
      },
      {
        title: "状态",
        width: 180,
        render: (_: unknown, record: ImageItem) => {
          const task = tasks.find((t) => t.imageId === record.id);
          if (!task) return <Text type="tertiary">待处理</Text>;

          const statusMap = {
            pending: { color: "grey" as const, text: "等待中" },
            processing: { color: "blue" as const, text: "处理中" },
            completed: { color: "green" as const, text: "已完成" },
            failed: { color: "red" as const, text: "失败" },
          };

          return (
            <div>
              <Tag color={statusMap[task.status].color}>
                {statusMap[task.status].text}
              </Tag>
              {task.status === "processing" && (
                <Progress
                  percent={task.progress}
                  size="small"
                  style={{ marginTop: 4, width: 120 }}
                />
              )}
              {task.status === "completed" && task.outputSize && (
                <Text type="tertiary" style={{ display: "block", fontSize: 12 }}>
                  输出: {formatFileSize(task.outputSize)}
                </Text>
              )}
              {task.status === "failed" && task.errorMessage && (
                <Text type="tertiary" style={{ display: "block", fontSize: 12 }}>
                  {task.errorMessage.slice(0, 50)}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        title: "操作",
        width: 80,
        render: (_: unknown, record: ImageItem) => (
          <Button
            theme="borderless"
            type="danger"
            icon={<Trash2 size={16} />}
            size="small"
            onClick={() => removeImage(record.id)}
          />
        ),
      },
    ],
    [allSelected, hasSelected, selectAllImages, toggleSelectImage, setPreviewImage, tasks, removeImage]
  );

  /** 任务统计 */
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    processing: tasks.filter((t) => t.status === "processing").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  return (
    <div>
      {/* 页面标题 */}
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
            图片处理
          </Title>
          <Text type="tertiary">批量压缩、格式转换、尺寸调整、重命名</Text>
        </div>
        <Space>
          <Button
            icon={<Settings size={16} />}
            onClick={() => setShowSettings(true)}
          >
            处理设置
          </Button>
          {images.length > 0 && (
            <Button
              icon={<RotateCcw size={16} />}
              type="danger"
              onClick={handleClearAll}
            >
              清空全部
            </Button>
          )}
        </Space>
      </div>

      {/* 操作栏 */}
      <Card
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
          marginBottom: 16,
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space>
            <Button
              theme="solid"
              icon={<FolderOpen size={16} />}
              loading={loadingImages}
              onClick={handleSelectFolder}
            >
              选择文件夹
            </Button>
            <Button
              icon={<CheckSquare size={16} />}
              onClick={() => selectAllImages(!allSelected)}
            >
              {allSelected ? "取消全选" : "全选"}
            </Button>
            <Text type="tertiary">
              已选择 {selectedImages.length} / {images.length} 张
            </Text>
          </Space>

          <Space>
            {settings.outputDir && (
              <Text type="tertiary" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                <FolderOutput size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                {settings.outputDir}
              </Text>
            )}
            {isProcessing ? (
              <Button
                type="danger"
                theme="solid"
                icon={<Square size={16} />}
                onClick={handleStopProcess}
              >
                停止
              </Button>
            ) : (
              <Button
                theme="solid"
                type="primary"
                icon={<Play size={16} />}
                disabled={!hasSelected || !settings.outputDir}
                onClick={handleStartProcess}
              >
                开始处理
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 任务进度总览 */}
      {tasks.length > 0 && (
        <Card
          style={{
            background: "var(--semi-color-bg-2, #334155)",
            border: "1px solid var(--semi-color-border, #475569)",
            marginBottom: 16,
          }}
          bodyStyle={{ padding: "12px 20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Text strong>任务进度:</Text>
            <Space>
              <Tag color="grey">等待 {taskStats.pending}</Tag>
              <Tag color="blue">处理中 {taskStats.processing}</Tag>
              <Tag color="green">完成 {taskStats.completed}</Tag>
              <Tag color="red">失败 {taskStats.failed}</Tag>
            </Space>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Progress
                percent={
                  taskStats.total > 0
                    ? Math.round(
                        ((taskStats.completed + taskStats.failed) / taskStats.total) * 100
                      )
                    : 0
                }
                size="small"
                showInfo
              />
            </div>
          </div>
        </Card>
      )}

      {/* 图片列表 */}
      <Card
        style={{
          background: "var(--semi-color-bg-2, #334155)",
          border: "1px solid var(--semi-color-border, #475569)",
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={images}
          pagination={false}
          empty={
            <Empty
              image={<Image size={64} color="#475569" />}
              description={
                <div>
                  <Text type="tertiary" style={{ display: "block", marginBottom: 16 }}>
                    暂无图片，请选择文件夹导入
                  </Text>
                  <Button
                    theme="solid"
                    icon={<FolderOpen size={16} />}
                    onClick={handleSelectFolder}
                  >
                    选择文件夹
                  </Button>
                </div>
              }
            />
          }
        />
      </Card>

      {/* 处理设置弹窗 */}
      <Modal
        title="处理设置"
        visible={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={
          <Button theme="solid" onClick={() => setShowSettings(false)}>
            确定
          </Button>
        }
        width={600}
      >
        <div style={{ padding: "8px 0" }}>
          {/* 输出目录 */}
          <Form.Section text="输出设置">
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Input
                value={settings.outputDir}
                placeholder="选择输出目录"
                style={{ flex: 1 }}
                prefix={<FolderOutput size={16} />}
                readOnly
              />
              <Button onClick={handleSelectOutputDir}>浏览</Button>
            </div>
          </Form.Section>

          {/* 操作类型 */}
          <Form.Section text="操作类型">
            <Space spacing={16} style={{ marginBottom: 16 }}>
              <Checkbox
                checked={settings.operations.includes("compress")}
                onChange={() => toggleOperation("compress")}
              >
                压缩质量
              </Checkbox>
              <Checkbox
                checked={settings.operations.includes("convert")}
                onChange={() => toggleOperation("convert")}
              >
                格式转换
              </Checkbox>
              <Checkbox
                checked={settings.operations.includes("resize")}
                onChange={() => toggleOperation("resize")}
              >
                尺寸调整
              </Checkbox>
              <Checkbox
                checked={settings.operations.includes("rename")}
                onChange={() => toggleOperation("rename")}
              >
                重命名
              </Checkbox>
            </Space>
          </Form.Section>

          {/* 压缩质量 */}
          {settings.operations.includes("compress") && (
            <Form.Section text="压缩质量">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>质量</Text>
                  <Text strong>{settings.quality}%</Text>
                </div>
                <Slider
                  value={settings.quality}
                  min={1}
                  max={100}
                  step={1}
                  onChange={(v) => setQuality(v as number)}
                />
                <Text type="tertiary" style={{ fontSize: 12 }}>
                  数值越低压缩率越高，文件越小，但画质会降低
                </Text>
              </div>
            </Form.Section>
          )}

          {/* 格式转换 */}
          {settings.operations.includes("convert") && (
            <Form.Section text="目标格式">
              <div style={{ marginBottom: 16 }}>
                <Select
                  value={settings.targetFormat}
                  onChange={(v) => setTargetFormat(v as ImageFormat)}
                  style={{ width: 200 }}
                >
                  <Option value="jpg">JPEG</Option>
                  <Option value="png">PNG</Option>
                  <Option value="webp">WebP</Option>
                </Select>
                <Text type="tertiary" style={{ fontSize: 12, marginLeft: 12 }}>
                  WebP 格式体积更小，兼容性良好
                </Text>
              </div>
            </Form.Section>
          )}

          {/* 尺寸调整 */}
          {settings.operations.includes("resize") && (
            <Form.Section text="目标尺寸">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div>
                    <Text style={{ display: "block", marginBottom: 4 }}>宽度 (px)</Text>
                    <InputNumber
                      value={settings.targetWidth}
                      onChange={(v) =>
                        setTargetSize(v as number | undefined, settings.targetHeight)
                      }
                      placeholder="原尺寸"
                      min={1}
                      style={{ width: 120 }}
                    />
                  </div>
                  <Text type="tertiary" style={{ marginTop: 20 }}>
                    x
                  </Text>
                  <div>
                    <Text style={{ display: "block", marginBottom: 4 }}>高度 (px)</Text>
                    <InputNumber
                      value={settings.targetHeight}
                      onChange={(v) =>
                        setTargetSize(settings.targetWidth, v as number | undefined)
                      }
                      placeholder="原尺寸"
                      min={1}
                      style={{ width: 120 }}
                    />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <Switch
                      checked={settings.maintainAspectRatio}
                      onChange={(v: boolean) =>
                        setSettings({ maintainAspectRatio: v })
                      }
                      checkedText="保持比例"
                      uncheckedText="自由缩放"
                    />
                  </div>
                </div>
                <Text type="tertiary" style={{ fontSize: 12, marginTop: 8 }}>
                  留空则保持原始尺寸，保持比例时按最小边缩放
                </Text>
              </div>
            </Form.Section>
          )}

          {/* 重命名 */}
          {settings.operations.includes("rename") && (
            <Form.Section text="重命名规则">
              <div style={{ marginBottom: 16 }}>
                <Input
                  value={settings.renamePattern}
                  onChange={(v) => setRenamePattern(v)}
                  style={{ width: 300 }}
                  placeholder="{name}_{index}"
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>
                    可用占位符: {"{name}"} 原文件名, {"{index}"} 序号, {"{timestamp}"}{" "}
                    时间戳, {"{ext}"} 扩展名
                  </Text>
                </div>
              </div>
            </Form.Section>
          )}
        </div>
      </Modal>

      {/* 图片预览弹窗 */}
      <Modal
        title={previewImage?.fileName}
        visible={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width={800}
        centered
      >
        {previewImage && (
          <div style={{ textAlign: "center" }}>
            <img
              src={previewImage.thumbnailUrl}
              alt={previewImage.fileName}
              style={{
                maxWidth: "100%",
                maxHeight: 500,
                borderRadius: 8,
              }}
            />
            <Descriptions
              style={{ marginTop: 16, textAlign: "left" }}
              data={[
                { key: "文件名", value: previewImage.fileName },
                { key: "格式", value: previewImage.format.toUpperCase() },
                { key: "尺寸", value: `${previewImage.width} x ${previewImage.height}` },
                { key: "大小", value: formatFileSize(previewImage.fileSize) },
                { key: "路径", value: previewImage.filePath },
              ]}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
