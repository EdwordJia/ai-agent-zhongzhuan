import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Space } from '@douyinfe/semi-ui';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const { Text, Title } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', { username, password });
      const { token, admin } = res.data.data;
      login(token, admin);
      navigate('/');
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: 440,
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          border: '1px solid var(--border-color)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
        }}
        bodyStyle={{ padding: '48px 40px' }}
      >
        <Space vertical align="center" style={{ width: '100%', marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'var(--gradient-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
              marginBottom: 8,
            }}
          >
            <Sparkles size={36} color="#fff" />
          </div>
          <Title heading={3} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 24 }}>
            管理后台登录
          </Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            AI智能体管理系统 · 安全认证
          </Text>
        </Space>

        <Form layout="vertical">
          <Form.Input
            field="username"
            label="用户名"
            prefix={<User size={16} style={{ color: 'var(--text-muted)' }} />}
            placeholder="请输入管理员用户名"
            value={username}
            onChange={(v: string) => setUsername(v)}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 10,
            }}
          />
          <Form.Input
            field="password"
            label="密码"
            mode="password"
            prefix={<Lock size={16} style={{ color: 'var(--text-muted)' }} />}
            placeholder="请输入登录密码"
            value={password}
            onChange={(v: string) => setPassword(v)}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 10,
            }}
          />
          <Button
            theme="solid"
            type="primary"
            block
            loading={loading}
            onClick={handleSubmit}
            style={{
              marginTop: 24,
              height: 44,
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              background: 'var(--gradient-blue)',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
            }}
          >
            安全登录
          </Button>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            登录即表示同意服务条款与隐私政策
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
