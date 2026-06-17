import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Typography, Space, Tag, Toast } from '@douyinfe/semi-ui';
import { Plus, Edit2, Trash2, Network, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;
const { Option } = Select;

interface Channel {
  id: number;
  name: string;
  type: 'paid' | 'free';
  gateway_url: string;
  api_key: string | null;
  model: string;
  cost_per_image: number;
  priority: number;
  daily_free_limit: number;
  is_active: boolean;
  created_at: string;
}

const ChannelManagement: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'paid' as 'paid' | 'free',
    gateway_url: '',
    api_key: '',
    model: '',
    cost_per_image: 0,
    priority: 1,
    daily_free_limit: 0,
    is_active: true,
  });

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/channels');
      const data = res.data.data;
      setChannels(Array.isArray(data) ? data : data?.list || data?.channels || []);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'paid',
      gateway_url: '',
      api_key: '',
      model: '',
      cost_per_image: 0,
      priority: 1,
      daily_free_limit: 0,
      is_active: true,
    });
    setEditingChannel(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      gateway_url: channel.gateway_url,
      api_key: channel.api_key || '',
      model: channel.model,
      cost_per_image: channel.cost_per_image / 100,
      priority: channel.priority,
      daily_free_limit: channel.daily_free_limit,
      is_active: channel.is_active,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    setModalLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        type: formData.type,
        gateway_url: formData.gateway_url,
        model: formData.model,
        cost_per_image: Math.round(formData.cost_per_image * 100),
        priority: formData.priority,
        daily_free_limit: formData.daily_free_limit,
        is_active: formData.is_active,
      };
      // 编辑时如果 API Key 未修改（仍是脱敏值），则不提交，避免把 **** 存入库
      if (!editingChannel || !formData.api_key.includes('****')) {
        payload.api_key = formData.api_key;
      }
      if (editingChannel) {
        await api.put(`/admin/channels/${editingChannel.id}`, payload);
        Toast.success('渠道更新成功');
      } else {
        await api.post('/admin/channels', payload);
        Toast.success('渠道创建成功');
      }
      setModalVisible(false);
      resetForm();
      fetchChannels();
    } catch {
      // error handled by interceptor
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，是否继续？',
      onOk: async () => {
        try {
          await api.delete(`/admin/channels/${id}`);
          Toast.success('删除成功');
          fetchChannels();
        } catch {
          // error handled by interceptor
        }
      },
    });
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length <= 8) return '****';
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  };

  const getTypeTag = (type: string) => {
    const typeMap: Record<string, { color: string; label: string }> = {
      paid: { color: 'orange', label: '付费' },
      free: { color: 'green', label: '免费' },
    };
    const config = typeMap[type] || { color: 'grey', label: type };
    return <Tag color={config.color} size="small">{config.label}</Tag>;
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (val: string) => (
        <Text strong style={{ color: 'var(--text-primary)' }}>
          {val}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '模型',
      dataIndex: 'model',
      render: (val: string) => (
        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{val}</Text>
      ),
    },
    {
      title: '单张成本',
      dataIndex: 'cost_per_image',
      width: 110,
      render: (val: number) => (
        <Tag color="orange" size="small">
          {(val / 100).toFixed(2)} 元
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 90,
      render: (val: number) => (
        <Text style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{val}</Text>
      ),
    },
    {
      title: '每日免费',
      dataIndex: 'daily_free_limit',
      width: 100,
      render: (val: number) => (
        <Text style={{ color: 'var(--text-secondary)' }}>{val}</Text>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      width: 140,
      render: (key: string) => (
        <Tag color="grey" size="small" style={{ fontFamily: 'monospace' }}>
          {maskApiKey(key)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 90,
      render: (is_active: boolean) => (
        <Tag color={is_active ? 'green' : 'red'} size="small">
          {is_active ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Channel) => (
        <Space>
          <Button
            theme="light"
            type="primary"
            size="small"
            icon={<Edit2 size={14} />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            theme="light"
            type="danger"
            size="small"
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
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
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Network size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <Title heading={4} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 20 }}>
              渠道管理
            </Title>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              管理AI生图服务渠道配置
            </Text>
          </div>
        </div>
        <Space>
          <Button
            theme="borderless"
            icon={<RefreshCw size={16} />}
            onClick={fetchChannels}
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
            onClick={openAddModal}
          >
            新增渠道
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
          dataSource={channels}
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingChannel ? '编辑渠道' : '新增渠道'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          resetForm();
        }}
        confirmLoading={modalLoading}
        okText="保存"
        cancelText="取消"
        width={600}
        style={{ borderRadius: 16 }}
      >
        <Form layout="vertical">
          <Form.Input
            field="name"
            label="名称"
            value={formData.name}
            onChange={(v: string) => setFormData({ ...formData, name: v })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.Select
            field="type"
            label="类型"
            value={formData.type}
            onChange={(v: 'paid' | 'free') => setFormData({ ...formData, type: v })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          >
            <Option value="paid">付费</Option>
            <Option value="free">免费</Option>
          </Form.Select>
          <Form.Input
            field="gateway_url"
            label="网关地址"
            value={formData.gateway_url}
            onChange={(v: string) => setFormData({ ...formData, gateway_url: v })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.Input
            field="api_key"
            label="API Key"
            value={formData.api_key}
            onChange={(v: string) => setFormData({ ...formData, api_key: v })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.Input
            field="model"
            label="模型"
            value={formData.model}
            onChange={(v: string) => setFormData({ ...formData, model: v })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.InputNumber
            field="cost_per_image"
            label="单张成本（元）"
            value={formData.cost_per_image}
            onChange={(v: number) => setFormData({ ...formData, cost_per_image: v })}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.InputNumber
            field="priority"
            label="优先级"
            value={formData.priority}
            onChange={(v: number) => setFormData({ ...formData, priority: v })}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.InputNumber
            field="daily_free_limit"
            label="每日免费限额"
            value={formData.daily_free_limit}
            onChange={(v: number) => setFormData({ ...formData, daily_free_limit: v })}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Form.Select
            field="is_active"
            label="状态"
            value={formData.is_active ? 'true' : 'false'}
            onChange={(v: string) => setFormData({ ...formData, is_active: v === 'true' })}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          >
            <Option value="true">启用</Option>
            <Option value="false">禁用</Option>
          </Form.Select>
        </Form>
      </Modal>
    </Space>
  );
};

export default ChannelManagement;
