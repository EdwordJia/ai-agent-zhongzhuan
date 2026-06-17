import { test, expect, Page } from "@playwright/test";

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function resetMockAndStorage(page: Page) {
  await page.evaluate(() => {
    if (typeof window !== "undefined" && (window as any).__testTauriMock) {
      (window as any).__testTauriMock.reset();
    }
    localStorage.clear();
  });
}

// ====== 辅助函数：创建商品 ======
async function createProduct(page: Page, sku: string, name: string, category: string, price: string) {
  await page.goto("/products/new");
  await page.waitForLoadState("networkidle");

  await page.getByPlaceholder("如 HO-A05-0926-02").fill(sku);
  await page.getByPlaceholder("请输入商品名称").fill(name);
  await page.getByPlaceholder("如 护肤 / 家居 / 数码").fill(category);
  await page.getByPlaceholder("0.00").first().fill(price);
  await page.getByRole("button", { name: "保存" }).click();
  // 等待跳转回列表
  await page.waitForURL("**/products", { timeout: 10000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await resetMockAndStorage(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("dashboard renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const main = page.locator(".semi-layout-content");
    await expect(main.getByRole("heading", { name: "仪表盘" })).toBeVisible();
    await expect(page.getByText("OpenClaw 智能体")).toBeVisible();
    await expect(main.getByText("商品总数")).toBeVisible();
    await expect(main.getByText("素材图片")).toBeVisible();
    await expect(main.getByText("AI 任务")).toBeVisible();
    await expect(main.getByText("导出任务")).toBeVisible();
  });

  test("product CRUD", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    // 1. 新建商品
    await createProduct(page, "TEST-001", "测试商品A", "护肤", "99.00");

    // 2. 列表断言（在主内容区查找，避免导航栏干扰）
    await expect(main.getByText("测试商品A")).toBeVisible();
    await expect(main.getByText("TEST-001")).toBeVisible();
    await expect(main.getByText("护肤")).toBeVisible();

    // 3. 编辑商品
    await main.getByRole("button", { name: "编辑" }).first().click();
    await page.waitForURL("**/products/*", { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("0.00").first().fill("199.00");
    await page.getByRole("button", { name: "保存" }).click();
    await page.waitForURL("**/products", { timeout: 10000 });

    // 4. 断言价格已更新（通过重新进入编辑页验证）
    await main.getByRole("button", { name: "编辑" }).first().click();
    await page.waitForURL("**/products/*", { timeout: 10000 });
    const priceInput = page.getByPlaceholder("0.00").first();
    await expect(priceInput).toHaveValue("199");

    // 返回列表并删除
    await page.goto("/products");
    await page.waitForLoadState("networkidle");
    await main.getByRole("button", { name: "删除" }).first().click();

    // 断言列表为空
    await expect(main.getByText("暂无商品数据")).toBeVisible();
  });

  test("AI generate", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    // 先创建商品
    await createProduct(page, "AI-001", "AI测试商品", "家居", "88.00");

    // 进入 AI 生成页
    await page.goto("/ai-generate");
    await page.waitForLoadState("networkidle");
    await expect(main.getByRole("heading", { name: "AI 生成" })).toBeVisible();

    // 选择商品 — Semi Select 组件通过点击 trigger 打开下拉
    await page.locator(".semi-select").filter({ hasText: /选择要关联的商品/ }).click();
    await page.locator(".semi-select-option").filter({ hasText: "AI测试商品" }).first().click();

    // 输入关键词
    await page.locator("textarea").fill("天然成分, 抗衰老");

    // 点击开始生成
    await page.getByRole("button", { name: "开始生成" }).click();

    // 等待结果出现（mock 下 generateContent 可能直接返回，但这里等待 UI 反馈）
    await expect(page.getByText("生成成功")).toBeVisible({ timeout: 15000 });

    // 点击应用到商品
    await page.getByRole("button", { name: "应用到商品" }).click();
    await expect(page.getByText("标题已应用到商品")).toBeVisible();
  });

  test("image process", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    await page.goto("/images");
    await page.waitForLoadState("networkidle");
    await expect(main.getByRole("heading", { name: "图片处理" })).toBeVisible();

    // Seed mock 数据（必须在页面加载后，避免模块初始化覆盖）
    await page.evaluate((dataUrl) => {
      window.__testTauriMock.setNextFolder("/test/images");
      window.__testTauriMock.setImageDir("/test/images", ["/test/images/sample.png"]);
      window.__testTauriMock.seedFile("/test/images/sample.png", dataUrl);
    }, ONE_PIXEL_PNG);

    // 选择文件夹
    await page.getByRole("button", { name: "选择文件夹" }).first().click();
    await expect(page.getByText("sample.png")).toBeVisible();

    // 设置输出目录（通过处理设置弹窗）
    await page.evaluate(() => {
      window.__testTauriMock.setNextFolder("/test/output");
    });
    await page.getByRole("button", { name: "处理设置" }).click();
    await page.getByRole("button", { name: "浏览" }).click();
    await page.getByRole("button", { name: "确定" }).click();

    // 开始处理
    await page.getByRole("button", { name: "开始处理" }).click();

    // 等待完成标签
    await expect(page.getByText("已完成").first()).toBeVisible({ timeout: 15000 });
  });

  test("export task", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    // 先创建商品
    await createProduct(page, "EXP-001", "导出测试商品", "数码", "299.00");

    await page.goto("/export");
    await page.waitForLoadState("networkidle");
    await expect(main.getByRole("heading", { name: "导出任务" })).toBeVisible();

    // 新建导出
    await main.getByRole("button", { name: "新建导出" }).first().click();

    // 填写任务名
    await page.getByPlaceholder("例如：1688商品资料包_202406").fill("测试导出任务");

    // 选择模板
    await page.locator(".semi-form-field").filter({ hasText: /导出模板/ }).locator(".semi-select").click();
    await page.locator(".semi-select-option").filter({ hasText: "1688" }).first().click();

    // 选择商品
    await page.getByText("导出测试商品").click();

    // 设置输出目录
    await page.evaluate(() => {
      window.__testTauriMock.setNextFolder("/test/export");
    });
    await page.getByRole("button", { name: "选择目录" }).click();

    // 开始导出
    await page.getByRole("button", { name: "开始导出" }).click();

    // 等待状态变为已完成
    await expect(page.getByText("已完成").first()).toBeVisible({ timeout: 10000 });
  });

  test("settings persist", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(main.getByRole("heading", { name: "设置", exact: true })).toBeVisible();

    // 选择 AI provider
    await page.locator(".semi-form-field").filter({ hasText: /AI 提供商/ }).locator(".semi-select").click();
    await page.locator(".semi-select-option").filter({ hasText: "OpenAI" }).first().click();

    // 填写 API Key
    await page.getByPlaceholder("sk-...").fill("sk-test-key-12345");

    // 填写 API Base
    const apiBaseInput = page.getByPlaceholder(/api.openai.com/);
    await apiBaseInput.fill("https://api.openai.com/v1");

    // 选择模型
    await page.locator(".semi-form-field").filter({ hasText: /模型/ }).locator(".semi-select").click();
    await page.locator(".semi-select-option").filter({ hasText: "gpt-4o" }).first().click();

    // 保存
    await page.getByRole("button", { name: "保存 AI 配置" }).click();
    await expect(page.getByText("AI 配置已保存到 localStorage")).toBeVisible();

    // 刷新页面
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 断言值保留（通过表单值或文本内容）
    await expect(page.getByPlaceholder("sk-...")).toHaveValue("sk-test-key-12345");
    await expect(page.getByPlaceholder(/api.openai.com/)).toHaveValue("https://api.openai.com/v1");
  });

  test("AI image generate renders", async ({ page }) => {
    const main = page.locator(".semi-layout-content");

    await page.goto("/ai-image");
    await page.waitForLoadState("networkidle");

    await expect(main.getByRole("heading", { name: "AI 生图" })).toBeVisible();
    await expect(main.getByText("调用 GPT Image2 付费生图")).toBeVisible();
    await expect(main.getByPlaceholder("描述你想要的商品图片")).toBeVisible();
    await expect(main.getByRole("button", { name: "开始生图" })).toBeDisabled();
  });

  test("chatbox opens and responds", async ({ page }) => {
    // Mock LLM API so the test does not hit the real endpoint
    await page.route("https://newapi.panda-w.com/v1/chat/completions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-5.5",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "你好！我是 OpenClaw 智能体助手（测试模式）。",
              },
              finish_reason: "stop",
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 打开聊天框
    await page.getByRole("button", { name: "打开聊天" }).click();
    await expect(
      page.locator(".openclaw-chat-sidesheet").getByText("OpenClaw 智能体", { exact: true })
    ).toBeVisible();
    await expect(page.getByPlaceholder("输入问题，按 Enter 发送...")).toBeVisible();

    // 发送问候并等待回复
    await page.getByPlaceholder("输入问题，按 Enter 发送...").fill("你好");
    await page.getByPlaceholder("输入问题，按 Enter 发送...").press("Enter");
    await expect(page.getByText("你好！我是 OpenClaw 智能体助手（测试模式）。")).toBeVisible({ timeout: 5000 });

    // 关闭聊天框
    await page.locator(".semi-sidesheet-close").click();
    await expect(page.getByPlaceholder("输入问题，按 Enter 发送...")).not.toBeVisible();
  });
});
