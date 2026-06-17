import React, { useState } from 'react';
import { Layout, Nav, Button, Typography, Space, Dropdown, Badge, Input } from '@douyinfe/semi-ui';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Network,
  FileText,
  LogOut,
  User,
  ChevronDown,
  Search,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { itemKey: '/', text: '数据概览', icon: <LayoutDashboard size={18} /> },
  { itemKey: '/users', text: '用户管理', icon: <Users size={18} /> },
  { itemKey: '/codes', text: '兑换码管理', icon: <Ticket size={18} /> },
  { itemKey: '/channels', text: '渠道管理', icon: <Network size={18} /> },
  { itemKey: '/logs', text: '生图日志', icon: <FileText size={18} /> },
];

const pageTitles: Record<string, string> = {
  '/': '数据概览',
  '/users': '用户管理',
  '/codes': '兑换码管理',
  '/channels': '渠道管理',
  '/logs': '生图日志',
};

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuthStore();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([location.pathname]);
  const [collapsed, setCollapsed] = useState(false);

  const handleSelect = (data: any) => {
    setSelectedKeys([data.itemKey]);
    navigate(data.itemKey);
  };

  const dropdownMenu = [
    {
      node: 'item',
      name: '退出登录',
      icon: <LogOut size={14} />,
      onClick: logout,
    },
  ];

  const siderWidth = collapsed ? 80 : 240;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        style={{
          width: siderWidth,
          transition: 'width 0.3s ease',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            padding: collapsed ? '20px 12px' : '24px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'all 0.3s ease',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--gradient-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <LayoutDashboard size={22} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <Text
                strong
                style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  lineHeight: '1.4',
                }}
              >
                AI智能体
              </Text>
              <Text
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  lineHeight: '1.4',
                }}
              >
                管理后台
              </Text>
            </div>
          )}
        </div>

        {/* 导航 */}
        <Nav
          items={menuItems.map((item) => ({
            ...item,
            text: collapsed ? '' : item.text,
          }))}
          selectedKeys={selectedKeys}
          onSelect={handleSelect}
          style={{
            width: '100%',
            padding: '12px 0',
          }}
          footer={
            collapsed ? null : (
              <div
                style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border-color)',
                  textAlign: 'center',
                }}
              >
                <Text style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  v1.0.0
                </Text>
              </div>
            )
          }
        />
      </Sider>

      <Layout
        style={{
          marginLeft: siderWidth,
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
        }}
      >
        {/* 顶部 Header */}
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            position: 'sticky',
            top: 0,
            zIndex: 99,
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(15, 23, 42, 0.85) !important',
          }}
        >
          {/* 左侧：折叠按钮 + 页面标题 */}
          <Space align="center" spacing="tight">
            <Button
              theme="borderless"
              icon={collapsed ? <Menu size={18} /> : <X size={18} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                color: 'var(--text-secondary)',
                width: 36,
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            <div>
              <Text
                strong
                style={{
                  fontSize: '18px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.4',
                }}
              >
                {pageTitles[location.pathname] || '数据概览'}
              </Text>
              <Text
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  lineHeight: '1.4',
                }}
              >
                {new Date().toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </Text>
            </div>
          </Space>

          {/* 右侧：搜索 + 通知 + 用户 */}
          <Space align="center" spacing="loose">
            {/* 搜索框 */}
            <Input
              prefix={<Search size={16} style={{ color: 'var(--text-muted)' }} />}
              placeholder="全局搜索..."
              style={{
                width: 240,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'var(--border-color-strong)',
                borderRadius: 8,
                color: 'var(--text-primary)',
              }}
            />

            {/* 通知图标 */}
            <Badge count={0} dot>
              <Button
                theme="borderless"
                icon={<Bell size={18} />}
                style={{
                  color: 'var(--text-secondary)',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
            </Badge>

            {/* 用户下拉 */}
            <Dropdown menu={dropdownMenu} position="bottomRight">
              <Button
                theme="borderless"
                style={{
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 12px 4px 4px',
                  borderRadius: 24,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  height: 40,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--gradient-blue)',
                    border: '2px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  <User size={14} />
                </div>
                <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {admin?.username || '管理员'}
                </Text>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </Button>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: '24px', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
