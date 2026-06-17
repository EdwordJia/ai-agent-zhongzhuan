import { useCallback, useMemo, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Nav, Layout, Button, Typography, Avatar, Tag, Space } from "@douyinfe/semi-ui";
import {
  LayoutDashboard,
  Package,
  Image,
  Sparkles,
  Download,
  Settings,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Coins,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { useUserStore } from "../stores/userStore";
import ChatBox from "../components/ChatBox";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

/** 导航项配置 */
interface NavItem {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    key: "dashboard",
    path: "/",
    label: "仪表盘",
    icon: <LayoutDashboard size={18} />,
  },
  {
    key: "products",
    path: "/products",
    label: "商品管理",
    icon: <Package size={18} />,
  },
  {
    key: "images",
    path: "/images",
    label: "图片处理",
    icon: <Image size={18} />,
  },
  {
    key: "ai-generate",
    path: "/ai-generate",
    label: "AI 生成",
    icon: <Sparkles size={18} />,
  },
  {
    key: "ai-image",
    path: "/ai-image",
    label: "AI 生图",
    icon: <Palette size={18} />,
  },
  {
    key: "export",
    path: "/export",
    label: "导出任务",
    icon: <Download size={18} />,
  },
  {
    key: "settings",
    path: "/settings",
    label: "设置",
    icon: <Settings size={18} />,
  },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, setActivePage } = useUIStore();
  const userStore = useUserStore();

  // Initialize user store on mount
  useEffect(() => {
    userStore.initMachine();
    userStore.authMachine();
  }, []);

  // 根据当前路径匹配导航项
  const activeKey = useMemo(() => {
    const item = navItems.find((n) => {
      if (n.path === "/") return location.pathname === "/";
      return location.pathname.startsWith(n.path);
    });
    return item?.key ?? "dashboard";
  }, [location.pathname]);

  const handleNavClick = useCallback(
    (itemKey: string) => {
      const item = navItems.find((n) => n.key === itemKey);
      if (item) {
        setActivePage(item.path);
        navigate(item.path);
      }
    },
    [navigate, setActivePage]
  );

  return (
    <Layout
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--semi-color-bg-0, #0f172a)",
      }}
    >
      {/* 顶部 Header */}
      <Header
        style={{
          height: 56,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--semi-color-bg-1, #1e293b)",
          borderBottom: "1px solid var(--semi-color-border, #475569)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Zap size={22} color="#3b82f6" />
          <Text
            strong
            style={{
              fontSize: 16,
              color: "var(--semi-color-text-0, #f8fafc)",
              letterSpacing: 1,
            }}
          >
            OpenClaw 智能体
          </Text>
          <Tag color="blue" style={{ marginLeft: 4 }}>
            MVP
          </Tag>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {userStore.isAuthenticated && (
            <Space>
              <Coins size={14} color="#f59e0b" />
              <Text style={{ color: "#cbd5e1", fontSize: 13 }}>
                {userStore.points} 积分
              </Text>
            </Space>
          )}
          <Button
            theme="borderless"
            icon={
              sidebarCollapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )
            }
            onClick={toggleSidebar}
            style={{ color: "var(--semi-color-text-1, #cbd5e1)" }}
          />
          <Avatar size="small" style={{ background: "#3b82f6" }}>
            OC
          </Avatar>
        </div>
      </Header>

      <Layout style={{ flex: 1, overflow: "hidden" }}>
        {/* 左侧 Sidebar */}
        <Sider
          style={{
            width: sidebarCollapsed ? 64 : 240,
            minWidth: sidebarCollapsed ? 64 : 240,
            maxWidth: sidebarCollapsed ? 64 : 240,
            background: "var(--semi-color-bg-0, #0f172a)",
            borderRight: "1px solid var(--semi-color-border, #475569)",
            transition: "width 0.3s ease",
            overflow: "hidden",
          }}
        >
          <Nav
            mode="vertical"
            selectedKeys={[activeKey]}
            onSelect={(data) => handleNavClick(data.itemKey as string)}
            style={{
              width: sidebarCollapsed ? 64 : 240,
              height: "100%",
              background: "transparent",
            }}
            items={navItems.map((item) => ({
              itemKey: item.key,
              text: sidebarCollapsed ? undefined : item.label,
              icon: item.icon,
            }))}
            tooltipHideAfterClick
          />
        </Sider>

        {/* 内容区 */}
        <Content
          style={{
            flex: 1,
            overflow: "auto",
            padding: 24,
            background: "var(--semi-color-bg-1, #1e293b)",
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      <ChatBox />
    </Layout>
  );
}
