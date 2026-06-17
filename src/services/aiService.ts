import type { Product } from "../types";

export type AIGenerateType = "title" | "description" | "marketing" | "imagePrompt";

export interface AIResult {
  content: string;
  type: AIGenerateType;
  productId?: string;
  productName?: string;
  keywords: string;
  createdAt: number;
}

export interface AIConfig {
  provider: "openai" | "deepseek" | "ollama";
  apiKey: string;
  apiBase: string;
  model: string;
  temperature: number;
}

// Backward compatibility: removed localStorage config, return empty config
export function getAIConfig(): AIConfig {
  return {
    provider: "openai",
    apiKey: "",
    apiBase: "",
    model: "",
    temperature: 0.7,
  };
}

export function saveAIConfig(_config: AIConfig): void {
  // No-op: config removed from frontend, managed by backend
}

// ==================== 模拟生成模板 ====================

const titleTemplates = {
  en: [
    "Premium {name} - {keyword} | High Quality Guaranteed",
    "{name} with {keyword} - Best Seller {year}",
    "Top Rated {name} | {keyword} Formula | Free Shipping",
    "Professional Grade {name} - {keyword} Enhanced",
    "{name} {keyword} Edition - Limited Stock Available",
  ],
  zh: [
    "高品质{name} - {keyword}配方 | 正品保障",
    "{name}{keyword}升级版 - 热销爆款",
    "专业级{name} | {keyword}技术 | 包邮速发",
    "进口{name} - {keyword}精华 | 限时特惠",
    "{name} {keyword}特供版 - 库存有限",
  ],
};

const descTemplates = {
  en: `Product: {name}
Key Feature: {keyword}

Introducing our premium {name}, crafted with advanced {keyword} technology. This product delivers exceptional performance and reliability for discerning customers.

Key Benefits:
- Enhanced with {keyword} for optimal results
- Premium quality materials sourced globally
- Rigorous quality control and testing
- Suitable for professional and personal use
- Eco-friendly packaging and sustainable production

Specifications:
- Material: High-grade composite
- Origin: Carefully selected global suppliers
- Certification: ISO 9001, CE, FDA approved

Order now and experience the difference that {keyword} quality makes!`,

  zh: `产品名称：{name}
核心卖点：{keyword}

产品介绍：
我们精心打造的{name}，采用先进的{keyword}技术，为追求品质的客户带来卓越的使用体验。

产品优势：
- {keyword}配方，效果更出众
- 甄选全球优质原料，品质有保障
- 严格质检流程，每一件都经得起考验
- 专业级品质，家用也安心
- 环保包装，可持续生产理念

产品规格：
- 材质：高级复合材料
- 产地：全球优选供应商
- 认证：ISO 9001、CE、FDA认证

立即下单，感受{keyword}带来的品质升级！`,
};

const marketingTemplates = {
  en: [
    `🔥 FLASH SALE: {name} with {keyword} - 50% OFF Today Only!

Don't miss out on our best-selling {name}. Powered by cutting-edge {keyword} innovation, this is the upgrade your customers have been waiting for.

✨ Why Choose Us?
✓ Authentic {keyword} technology
✓ 30-day money-back guarantee
✓ Free express shipping worldwide
✓ 24/7 customer support

👉 Limited stock - Order before midnight!`,

    `✨ Discover the Secret of {keyword} with {name}

Join thousands of satisfied customers who have made the switch. Our {name} combines traditional craftsmanship with modern {keyword} science.

🎁 Special Offer: Buy 2 Get 1 Free
💰 Price Match Guarantee
🚚 Same-day dispatch

Tap "Buy Now" to claim your exclusive discount!`,
  ],

  zh: [
    `🔥 限时抢购：{name} {keyword}升级版 - 今日半价！

不要错过我们的明星产品{name}。搭载前沿{keyword}技术，这是您的客户期待已久的升级之选。

✨ 为什么选择我们？
✓ 正宗{keyword}技术授权
✓ 30天无理由退换
✓ 全球免费快递
✓ 7×24小时客服支持

👉 库存有限 - 午夜前下单！`,

    `✨ 探索{keyword}的秘密 - {name}全新上市

加入数千名满意客户的行列。我们的{name}将传统工艺与现代{keyword}科技完美结合。

🎁 特别优惠：买二送一
💰 全网最低价保障
🚚 当日发货

点击"立即购买"领取专属折扣！`,
  ],
};

const imagePromptTemplates = [
  `Product photography of {name}, {keyword} theme, clean white background, professional studio lighting, 8k ultra detailed, commercial advertisement style, centered composition, soft shadows, premium feel`,
  `Lifestyle product shot of {name} with {keyword} aesthetic, natural daylight, minimalist setting, bokeh background, high-end magazine editorial style, warm color grading, shallow depth of field`,
  `E-commerce hero image of {name}, {keyword} inspired design, gradient background, dramatic rim lighting, photorealistic rendering, sharp focus on product, subtle reflection on surface`,
];

function fillTemplate(template: string, product: Product, keywords: string): string {
  const year = new Date().getFullYear();
  return template
    .replace(/\{name\}/g, product.name)
    .replace(/\{keyword\}/g, keywords.split(/[,，\s]+/)[0] || keywords)
    .replace(/\{year\}/g, String(year));
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateTitle(product: Product, keywords: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
  const en = fillTemplate(randomPick(titleTemplates.en), product, keywords);
  const zh = fillTemplate(randomPick(titleTemplates.zh), product, keywords);
  return `${zh}\n\n${en}`;
}

export async function generateDescription(product: Product, keywords: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
  const zh = fillTemplate(descTemplates.zh, product, keywords);
  const en = fillTemplate(descTemplates.en, product, keywords);
  return `${zh}\n\n---\n\n${en}`;
}

export async function generateMarketingCopy(product: Product, keywords: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 800));
  const zh = fillTemplate(randomPick(marketingTemplates.zh), product, keywords);
  const en = fillTemplate(randomPick(marketingTemplates.en), product, keywords);
  return `${zh}\n\n---\n\n${en}`;
}

export async function generateImagePrompt(product: Product, keywords: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
  return randomPick(imagePromptTemplates)
    .replace(/\{name\}/g, product.name)
    .replace(/\{keyword\}/g, keywords.split(/[,，\s]+/)[0] || keywords);
}

// ==================== 统一生成入口（当前使用 Mock）====================

export async function generateContent(
  type: AIGenerateType,
  product: Product,
  keywords: string
): Promise<string> {
  // TODO: 接入后端 LLM 代理服务
  // 真实 LLM 调用应改为: POST /api/llm/generate
  // 当前使用 mock 数据，移除前端硬编码 API key

  switch (type) {
    case "title":
      return generateTitle(product, keywords);
    case "description":
      return generateDescription(product, keywords);
    case "marketing":
      return generateMarketingCopy(product, keywords);
    case "imagePrompt":
      return generateImagePrompt(product, keywords);
    default:
      throw new Error(`Unknown generate type: ${type}`);
  }
}
