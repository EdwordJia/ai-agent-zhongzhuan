import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Input, Modal, Form, Typography, Space, Tag } from '@douyinfe/semi-ui';
import { Search, Plus, Minus, RefreshCw, UserCheck } from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;

interface User {
  id: number;
  machine_id: string;
  points: number;
  total_consumed: number;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pointsDelta, setPointsDelta] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.machine_id = searchQuery;
      const res = await api.get('/admin/users', { params });
      const data = res.data.data;
      setUsers(Array.isArray(data) ? data : data?.list || data?.users || []);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = () => {
    fetchUsers();
  };

  const openPointsModal = (user: User, isAdd: boolean) => {
    setSelectedUser(user);
    setPointsDelta(isAdd ? 100 : -100);
    setModalVisible(true);
  };

  const handlePointsUpdate = async () => {
    if (!selectedUser || !pointsDelta) return;
    setModalLoading(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/points`, {
        delta: pointsDelta,
      });
      setModalVisible(false);
      fetchUsers();
    } catch {
      // error handled by interceptor
    } finally {
      setModalLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      render: (val: number) => (
        <Text style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 13 }}>
          #{val}
        </Text>
      ),
    },
    {
      title: 'Machine ID',
      dataIndex: 'machine_id',
      render: (val: string) => (
        <Text style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13 }}>
          {val}
        </Text>
      ),
    },
    {
      title: '当前积分',
      dataIndex: 'points',
      width: 120,
      render: (points: number) => (
        <Tag color="green" size="small">
          {(points / 100).toFixed(2)}
        </Tag>
      ),
    },
    {
      title: '总消耗',
      dataIndex: 'total_consumed',
      width: 120,
      render: (val: number | null) => (
        <Tag color="red" size="small">
          {val != null ? (val / 100).toFixed(2) : '0.00'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (val: string) => (
        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {new Date(val).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Button
            theme="light"
            type="primary"
            size="small"
            icon={<Plus size={14} />}
            onClick={() => openPointsModal(record, true)}
          >
            加积分
          </Button>
          <Button
            theme="light"
            type="danger"
            size="small"
            icon={<Minus size={14} />}
            onClick={() => openPointsModal(record, false)}
          >
            减积分
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
          marginBottom: 8,
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
            <UserCheck size={20} style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <Title heading={4} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 20 }}>
              用户管理
            </Title>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              管理平台用户及积分信息
            </Text>
          </div>
        </div>
        <Button
          theme="borderless"
          icon={<RefreshCw size={16} />}
          onClick={fetchUsers}
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
          }}
        >
          刷新
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Space>
            <Input
              prefix={<Search size={16} style={{ color: 'var(--text-muted)' }} />}
              placeholder="搜索 machine_id"
              value={searchQuery}
              onChange={(v: string) => setSearchQuery(v)}
              onEnterPress={handleSearch}
              style={{
                width: 300,
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'var(--border-color-strong)',
                borderRadius: 8,
              }}
            />
            <Button theme="solid" type="primary" onClick={handleSearch}>
              搜索
            </Button>
          </Space>
        </div>
      </Card>

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
          dataSource={users}
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
        />
      </Card>

      {/* 积分弹窗 */}
      <Modal
        title={`${pointsDelta > 0 ? '增加' : '减少'}积分 - ${selectedUser?.machine_id || ''}`}
        visible={modalVisible}
        onOk={handlePointsUpdate}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        okText="确认"
        cancelText="取消"
        style={{ borderRadius: 16 }}
      >
        <Form layout="vertical">
          <Form.InputNumber
            field="delta"
            label="变更量（分，正数增加，负数减少）"
            value={pointsDelta}
            onChange={(v: number) => setPointsDelta(v)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
          <Text style={{ color: 'var(--text-secondary)', marginTop: 8, display: 'block', fontSize: 13 }}>
            相当于 {(pointsDelta / 100).toFixed(2)} 元
          </Text>
        </Form>
      </Modal>
    </Space>
  );
};

export default UserManagement;
