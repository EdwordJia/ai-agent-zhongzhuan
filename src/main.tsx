import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@douyinfe/semi-ui/lib/es/_base/base.css";
import App from "./App";

// 深色主题配置：专业蓝色系管理后台风格
const darkTheme = {
  "color-primary": "#3b82f6",
  "color-primary-hover": "#2563eb",
  "color-primary-active": "#1d4ed8",
  "color-primary-disabled": "#93c5fd",
  "color-bg-0": "#0f172a",
  "color-bg-1": "#1e293b",
  "color-bg-2": "#334155",
  "color-bg-3": "#475569",
  "color-text-0": "#f8fafc",
  "color-text-1": "#cbd5e1",
  "color-text-2": "#94a3b8",
  "color-text-3": "#64748b",
  "color-border": "#475569",
  "color-border-1": "#334155",
  "color-nav-bg": "#0f172a",
  "color-nav-text": "#cbd5e1",
  "color-nav-text-hover": "#f8fafc",
  "color-nav-text-active": "#3b82f6",
  "color-nav-bg-active": "#1e293b",
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// 通过 CSS 变量注入主题色
const style = document.createElement("style");
style.textContent = Object.entries(darkTheme)
  .map(([k, v]) => `--semi-${k.replace(/-/g, "_")}: ${v};`)
  .join("\n");
document.head.appendChild(style);
