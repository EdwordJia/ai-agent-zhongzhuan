import { useTaskStore } from "../stores/taskStore";
import { invoke } from "@tauri-apps/api/core";
import type { ExportTask } from "../types";

interface ExportResult {
  zipPath: string;
  productCount: number;
  imageCount: number;
  videoCount: number;
}

export interface ExportRunResult {
  success: boolean;
  taskId: string;
  zipPath: string;
  productCount: number;
  imageCount: number;
  videoCount: number;
  error?: string;
}

export async function createAndRunExportTask(
  name: string,
  template: ExportTask["template"],
  productIds: string[],
  outputDir?: string
): Promise<ExportRunResult> {
  const { addTask, updateTask, setTaskStatus, setTaskProgress } = useTaskStore.getState();

  const task = addTask({
    name,
    template,
    productIds,
    outputPath: outputDir,
  });

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

    return {
      success: true,
      taskId: task.id,
      zipPath: result.zipPath,
      productCount: result.productCount,
      imageCount: result.imageCount,
      videoCount: result.videoCount,
    };
  } catch (err) {
    const msg = String(err);
    setTaskStatus(task.id, "failed", msg);
    return {
      success: false,
      taskId: task.id,
      zipPath: "",
      productCount: 0,
      imageCount: 0,
      videoCount: 0,
      error: msg,
    };
  }
}
