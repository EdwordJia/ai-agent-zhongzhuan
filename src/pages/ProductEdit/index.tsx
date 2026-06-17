import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Form,
  Toast,
  Select,
  Modal,
} from "@douyinfe/semi-ui";
import {
  Save,
  ArrowLeft,
  Trash2,
  GripVertical,
  ImagePlus,
  FolderOpen,
} from "lucide-react";
import { useProductStore } from "../../stores/productStore";
import { useEffect, useMemo, useState, useCallback } from "react";
import { generateSku, generateId } from "../../utils/helpers";
import type { Product, MaterialImage } from "../../types";
import { invoke } from "@tauri-apps/api/core";

const { Title, Text } = Typography;
const { Option } = Select;

const IMAGE_TYPE_OPTIONS = [
  { value: "carousel", label: "轮播图" },
  { value: "detail", label: "详情图" },
  { value: "certificate", label: "资质图" },
  { value: "video", label: "视频" },
  { value: "thumbnail", label: "缩略图" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "active", label: "上架" },
  { value: "archived", label: "归档" },
];

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, setCurrentProduct, currentProduct } =
    useProductStore();

  const isNew = id === "new" || !id;

  const product = useMemo(() => {
    if (isNew) return null;
    return products.find((p) => p.id === id) || null;
  }, [id, products, isNew]);

  const [images, setImages] = useState<MaterialImage[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
      setImages(product.images || []);
    } else if (isNew) {
      setCurrentProduct(null);
      setImages([]);
    }
  }, [product, isNew, setCurrentProduct]);

  const handleSelectImages = useCallback(async () => {
    try {
      const result = await invoke<string[] | null>("select_images");
      if (!result || result.length === 0) return;

      const newImages: MaterialImage[] = result.map((filePath, index) => {
        const fileName = filePath.split(/[\\/]/).pop() || "";
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const format = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
          ? (ext as MaterialImage["format"])
          : "jpg";
        return {
          id: generateId(),
          productId: id || "new",
          type: "carousel",
          fileName,
          filePath,
          fileSize: 0,
          width: 0,
          height: 0,
          format,
          sortOrder: images.length + index,
          createdAt: Date.now(),
        };
      });

      setImages((prev) => [...prev, ...newImages]);
      Toast.success(`已添加 ${newImages.length} 张图片`);
    } catch (error) {
      console.error("选择图片失败:", error);
      Toast.error("选择图片失败");
    }
  }, [id, images.length]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const folder = await invoke<string | null>("select_folder");
      if (!folder) return;

      const files = await invoke<string[]>("read_image_dir", { path: folder });
      if (files.length === 0) {
        Toast.warning("所选文件夹中没有图片");
        return;
      }

      const newImages: MaterialImage[] = files.map((filePath, index) => {
        const fileName = filePath.split(/[\\/]/).pop() || "";
        const ext = fileName.split(".").pop()?.toLowerCase() || "";
        const format = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)
          ? (ext as MaterialImage["format"])
          : "jpg";
        return {
          id: generateId(),
          productId: id || "new",
          type: "carousel",
          fileName,
          filePath,
          fileSize: 0,
          width: 0,
          height: 0,
          format,
          sortOrder: images.length + index,
          createdAt: Date.now(),
        };
      });

      setImages((prev) => [...prev, ...newImages]);
      Toast.success(`已从文件夹添加 ${newImages.length} 张图片`);
    } catch (error) {
      console.error("读取文件夹失败:", error);
      Toast.error("读取文件夹失败");
    }
  }, [id, images.length]);

  const handleDeleteImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleImageTypeChange = useCallback((imageId: string, type: MaterialImage["type"]) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, type } : img))
    );
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) return;
      setImages((prev) => {
        const newImages = [...prev];
        const [removed] = newImages.splice(dragIndex, 1);
        newImages.splice(index, 0, removed);
        return newImages.map((img, i) => ({ ...img, sortOrder: i }));
      });
      setDragIndex(index);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
      sku: (values.sku as string) || generateSku(),
      name: (values.name as string) || "",
      category: (values.category as string) || "",
      description: (values.description as string) || "",
      price: Number(values.price) || 0,
      cost: Number(values.cost) || 0,
      currency: "CNY",
      weight: Number(values.weight) || 0,
      dimensions: {
        length: Number((values.dimensions as Record<string, unknown>)?.length) || 0,
        width: Number((values.dimensions as Record<string, unknown>)?.width) || 0,
        height: Number((values.dimensions as Record<string, unknown>)?.height) || 0,
      },
      material: (values.material as string) || "",
      origin: (values.origin as string) || "",
      tags: Array.isArray(values.tags) ? (values.tags as string[]) : [],
      status: (values.status as Product["status"]) || "draft",
      images: images.map((img, index) => ({ ...img, sortOrder: index })),
    };

    try {
      if (isNew) {
        await addProduct(payload);
        Toast.success("商品创建成功");
      } else if (id) {
        await updateProduct(id, payload);
        Toast.success("商品更新成功");
      }
      navigate("/products");
    } catch (error) {
      console.error("保存商品失败:", error);
      Toast.error("保存失败，请重试");
    }
  };

  const initialValues = useMemo(() => {
    if (isNew) {
      return {
        sku: generateSku(),
        name: "",
        category: "",
        description: "",
        price: 0,
        cost: 0,
        weight: 0,
        dimensions: { length: 0, width: 0, height: 0 },
        material: "",
        origin: "",
        tags: [],
        status: "draft",
      };
    }
    return currentProduct || product || {};
  }, [isNew, currentProduct, product]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button
          theme="borderless"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate("/products")}
          style={{ color: "#cbd5e1" }}
        />
        <div>
          <Title heading={3} style={{ margin: 0, color: "#f8fafc" }}>
            {isNew ? "新建商品" : "编辑商品"}
          </Title>
          <Text type="tertiary">{isNew ? "录入新商品资料" : `货号: ${product?.sku || ""}`}</Text>
        </div>
      </div>

      <Form
        labelPosition="left"
        labelAlign="right"
        labelWidth={100}
        onSubmit={handleSubmit}
        initValues={initialValues}
      >
        <Card
          style={{
            background: "var(--semi-color-bg-2, #334155)",
            border: "1px solid var(--semi-color-border, #475569)",
            marginBottom: 24,
          }}
          bodyStyle={{ padding: "24px 32px" }}
          title="基本信息"
        >
          <Form.Input
            field="sku"
            label="货号"
            placeholder="如 HO-A05-0926-02"
            rules={[{ required: true, message: "请输入货号" }]}
          />
          <Form.Input
            field="name"
            label="商品名称"
            placeholder="请输入商品名称"
            rules={[{ required: true, message: "请输入商品名称" }]}
          />
          <Form.Input
            field="category"
            label="分类"
            placeholder="如 护肤 / 家居 / 数码"
          />
          <Form.Select
            field="status"
            label="状态"
            placeholder="请选择状态"
            style={{ width: 160 }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Form.Select>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Input
              field="price"
              label="售价"
              placeholder="0.00"
              type="number"
              style={{ flex: 1 }}
            />
            <Form.Input
              field="cost"
              label="成本价"
              placeholder="0.00"
              type="number"
              style={{ flex: 1 }}
            />
          </div>
          <Form.TextArea
            field="description"
            label="商品描述"
            placeholder="请输入商品详细描述"
            rows={4}
          />
        </Card>

        <Card
          style={{
            background: "var(--semi-color-bg-2, #334155)",
            border: "1px solid var(--semi-color-border, #475569)",
            marginBottom: 24,
          }}
          bodyStyle={{ padding: "24px 32px" }}
          title="规格参数"
        >
          <Form.Input
            field="weight"
            label="重量"
            placeholder="单位：克"
            type="number"
          />
          <Form.Section text="尺寸 (cm)">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <Form.Input
                field="dimensions.length"
                label="长"
                placeholder="0"
                type="number"
                noLabel
                style={{ width: 120 }}
              />
              <span style={{ color: "#94a3b8", paddingBottom: 8 }}>×</span>
              <Form.Input
                field="dimensions.width"
                label="宽"
                placeholder="0"
                type="number"
                noLabel
                style={{ width: 120 }}
              />
              <span style={{ color: "#94a3b8", paddingBottom: 8 }}>×</span>
              <Form.Input
                field="dimensions.height"
                label="高"
                placeholder="0"
                type="number"
                noLabel
                style={{ width: 120 }}
              />
            </div>
          </Form.Section>
          <Form.Input
            field="material"
            label="材质"
            placeholder="如 纯棉 / 不锈钢 / 硅胶"
          />
          <Form.Input
            field="origin"
            label="产地"
            placeholder="如 中国广东 / 日本"
          />
          <Form.TagInput
            field="tags"
            label="标签"
            placeholder="输入标签后按回车添加"
            separator={[",", "Enter", " "]}
          />
        </Card>

        <Card
          style={{
            background: "var(--semi-color-bg-2, #334155)",
            border: "1px solid var(--semi-color-border, #475569)",
            marginBottom: 24,
          }}
          bodyStyle={{ padding: "24px 32px" }}
          title="商品图片"
        >
          <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <Button icon={<ImagePlus size={16} />} onClick={handleSelectImages}>
              选择图片
            </Button>
            <Button icon={<FolderOpen size={16} />} onClick={handleSelectFolder}>
              选择文件夹
            </Button>
            <Text type="tertiary" style={{ marginLeft: "auto", lineHeight: "32px" }}>
              共 {images.length} 张图片，拖拽可排序
            </Text>
          </div>

          {images.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                border: "2px dashed var(--semi-color-border, #475569)",
                borderRadius: 8,
                color: "#94a3b8",
              }}
            >
              <ImagePlus size={48} style={{ marginBottom: 12 }} />
              <Text type="tertiary">暂无图片，点击上方按钮添加</Text>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(index);
                  }}
                  onDragEnd={handleDragEnd}
                  style={{
                    position: "relative",
                    border: "1px solid var(--semi-color-border, #475569)",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--semi-color-bg-1, #1e293b)",
                    cursor: "move",
                    opacity: dragIndex === index ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      zIndex: 2,
                      cursor: "grab",
                      color: "#94a3b8",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: 4,
                      padding: 2,
                    }}
                  >
                    <GripVertical size={14} />
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      zIndex: 2,
                      cursor: "pointer",
                      color: "#ef4444",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: 4,
                      padding: 2,
                    }}
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <Trash2 size={14} />
                  </div>
                  <div
                    style={{
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#0f172a",
                      cursor: "pointer",
                    }}
                    onClick={() => setPreviewImage(img.filePath)}
                  >
                    {img.filePath ? (
                      <img
                        src={`file://${img.filePath}`}
                        alt={img.fileName}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ImagePlus size={32} color="#475569" />
                    )}
                  </div>
                  <div style={{ padding: 8 }}>
                    <Text
                      ellipsis
                      style={{
                        fontSize: 12,
                        color: "#e2e8f0",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      {img.fileName}
                    </Text>
                    <Select
                      size="small"
                      value={img.type}
                      onChange={(v) => handleImageTypeChange(img.id, v as MaterialImage["type"])}
                      style={{ width: "100%" }}
                    >
                      {IMAGE_TYPE_OPTIONS.map((opt) => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 40 }}>
          <Button onClick={() => navigate("/products")}>取消</Button>
          <Button theme="solid" icon={<Save size={16} />} htmlType="submit">
            保存
          </Button>
        </div>
      </Form>

      {previewImage && (
        <Modal
          visible={true}
          footer={null}
          onCancel={() => setPreviewImage(null)}
          centered
          size="large"
          style={{ maxWidth: "80vw" }}
        >
          <img
            src={`file://${previewImage}`}
            alt="预览"
            style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
          />
        </Modal>
      )}
    </div>
  );
}
