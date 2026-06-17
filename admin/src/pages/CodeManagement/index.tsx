import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Typography, Space, Tag, Toast } from '@douyinfe/semi-ui';
import { Plus, Copy, Ban, CheckCircle, Ticket, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;

interface RedeemCode {
  id: number;
  code: string;
  points: number;
  max_uses: number;
  used_count: number;
  status: 'active' | 'inactive';
  expires_at: string | null;
  created_at: string;
}

const CodeManagement: React.FC = () => {
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [genPoints, setGenPoints] = useState(1000);
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [genCount, setGenCount] = useState(10);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/codes');
      const data = res.data.data;
      setCodes(Array.isArray(data) ? data : data?.list || data?.codes || []);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleGenerate = async () => {
    setModalLoading(true);
    try {
      await api.post('/admin/codes', {
        points: genPoints,
        max_uses: genMaxUses,
        count: genCount,
      });
      Toast.success('兑换码生成成功');
      setModalVisible(false);
      fetchCodes();
    } catch {
      // error handled by interceptor
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const isActive = currentStatus !== 'active';
    try {
      await api.patch(`/admin/codes/${id}/status`, { is_active: isActive });
      Toast.success('状态更新成功');
      fetchCodes();
    } catch {
      // error handled by interceptor
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      Toast.success('已复制到剪贴板');
    });
  };

  const columns = [
    {
      title: '兑换码',
      dataIndex: 'code',
      render: (code: string) => (
        <Space>
          <Tag
            color="blue"
            style={{
              fontFamily: 'monospace',
              fontSize: 14,
              padding: '4px 12px',
              letterSpacing: '0.5px',
            }}
          >
            {code}
          </Tag>
          <Button
            theme="borderless"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => handleCopy(code)}
            style={{ color: 'var(--text-muted)' }}
          />
        </Space>
      ),
    },
    {
      title: '点数',
      dataIndex: 'points',
      width: 100,
      render: (val: number) => (
        <Text strong style={{ color: 'var(--accent-green)' }}>
          {(val / 100).toFixed(2)}
        </Text>
      ),
    },
    {
      title: '可用次数',
      dataIndex: 'max_uses',
      width: 100,
      render: (val: number) => (
        <Text style={{ color: 'var(--text-secondary)' }}>{val}</Text>
      ),
    },
    {
      title: '已用次数',
      dataIndex: 'used_count',
      width: 100,
      render: (val: number, record: RedeemCode) => {
        const isFull = val >= record.max_uses;
        return (
          <Text style={{ color: isFull ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
            {val} / {record.max_uses}
          </Text>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'} size="small">
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      width: 160,
      render: (val: string | null) => (
        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {val ? new Date(val).toLocaleString() : '永久有效'}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: RedeemCode) => (
        <Button
          theme="light"
          type={record.status === 'active' ? 'danger' : 'primary'}
          size="small"
          icon={record.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
          onClick={() => handleToggleStatus(record.id, record.status)}
        >
          {record.status === 'active' ? '禁用' : '启用'}
        </Button>
      ),
    },
  ];

  return (
    <Space vertical spacing="loose" style={{ width: '100%' }}>
      {/* 页面标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 8,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ticket size={20} style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <Title heading={4} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 20 }}>
              兑换码管理
            </Title>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              生成与管理积分兑换码
            </Text>
          </div>
        </div>
        <Space>
          <Button
            theme="borderless"
            icon={<RefreshCw size={16} />}
            onClick={fetchCodes}
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
            }}
          >
            刷新
          </Button>
          <Button
            theme="solid"
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setModalVisible(true)}
          >
            批量生成
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Card
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={codes}
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
        />
      </Card>

      {/* 批量生成弹窗 */}
      <Modal
        title="批量生成兑换码"
        visible={modalVisible}
        onOk={handleGenerate}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        okText="生成"
        cancelText="取消"
        style={{ borderRadius: 16 }}
      >
        <Form layout="vertical">
          <Form.InputNumber
            field="points"
            label="点数（分）"
            value={genPoints}
            onChange={(v: number) => setGenPoints(v)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Text style={{ color: 'var(--text-secondary)', marginBottom: 16, display: 'block', fontSize: 13 }}>
            相当于 {(genPoints / 100).toFixed(2)} 元
          </Text>
          <Form.InputNumber
            field="max_uses"
            label="每个兑换码可用次数"
            value={genMaxUses}
            onChange={(v: number) => setGenMaxUses(v)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.InputNumber
            field="count"
            label="生成数量"
            value={genCount}
            onChange={(v: number) => setGenCount(v)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
        </Form>
      </Modal>
    </Space>
  );
};

export default CodeManagement;
