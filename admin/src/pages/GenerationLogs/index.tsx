import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Tag, Button, Select, DatePicker } from '@douyinfe/semi-ui';
import { FileText, Filter, RefreshCw, Image } from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;
const { Option } = Select;

interface GenerationLog {
  id: number;
  user_id: number;
  user?: { machine_id: string } | null;
  channel_id: number;
  channel?: { name: string } | null;
  prompt: string;
  n: number;
  points_cost: number | null;
  status: 'success' | 'fail' | 'pending';
  created_at: string;
}

const GenerationLogs: React.FC = () => {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/logs/generations', { params });
      const data = res.data.data || {};
      const list = Array.isArray(data) ? data : data?.list || data?.logs || [];
      setLogs(list);
      setPagination({
        currentPage: page,
        pageSize,
        total: data.total || list.length || 0,
      });
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handlePageChange = (page: number) => {
    fetchLogs(page, pagination.pageSize);
  };

  const handlePageSizeChange = (pageSize: number) => {
    fetchLogs(1, pageSize);
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
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (val: string) => (
        <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          {new Date(val).toLocaleString()}
        </Text>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user',
      width: 140,
      render: (_: any, record: GenerationLog) => {
        const machineId = record.user?.machine_id || '';
        return (
          <Text style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 13 }}>
            {machineId ? `${machineId.slice(0, 12)}...` : '-'}
          </Text>
        );
      },
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 120,
      render: (_: any, record: GenerationLog) => (
        <Tag color="blue" size="small">{record.channel?.name || '-'}</Tag>
      ),
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      render: (val: string) => (
        <Text style={{ color: 'var(--text-primary)', maxWidth: 300 }} ellipsis={{ showTooltip: true }}>
          {val}
        </Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'n',
      width: 80,
      render: (val: number) => (
        <Text style={{ color: 'var(--text-secondary)' }}>{val}</Text>
      ),
    },
    {
      title: '消耗积分',
      dataIndex: 'points_cost',
      width: 120,
      render: (val: number | null) => {
        const cost = typeof val === 'number' ? val : 0;
        return (
          <Tag color="red" size="small">
            {(cost / 100).toFixed(2)}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          success: 'green',
          fail: 'red',
          failed: 'red',
          pending: 'orange',
        };
        const labelMap: Record<string, string> = {
          success: '成功',
          fail: '失败',
          failed: '失败',
          pending: '处理中',
        };
        return (
          <Tag color={colorMap[status] || 'grey'} size="small">
            {labelMap[status] || status}
          </Tag>
        );
      },
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
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={20} style={{ color: 'var(--accent-orange)' }} />
          </div>
          <div>
            <Title heading={4} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 20 }}>
              生图日志
            </Title>
            <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              查看用户生图请求记录与状态
            </Text>
          </div>
        </div>
        <Button
          theme="borderless"
          icon={<RefreshCw size={16} />}
          onClick={() => fetchLogs()}
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
          }}
        >
          刷新
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card
        style={{
          backgroundColor: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <Text style={{ color: 'var(--text-secondary)', fontSize: 14 }}>筛选条件：</Text>
          </div>
          <Select
            placeholder="状态筛选"
            value={statusFilter}
            onChange={(v: string) => setStatusFilter(v)}
            style={{
              width: 140,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          >
            <Option value="">全部状态</Option>
            <Option value="success">成功</Option>
            <Option value="fail">失败</Option>
            <Option value="pending">处理中</Option>
          </Select>
          <DatePicker
            type="dateRange"
            placeholder={['开始日期', '结束日期']}
            style={{
              width: 260,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderColor: 'var(--border-color-strong)',
              borderRadius: 8,
            }}
          />
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
          dataSource={logs}
          loading={loading}
          pagination={{
            currentPage: pagination.currentPage,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
            showSizeChanger: true,
            pageSizeOpts: [10, 20, 50, 100],
          }}
          rowKey="id"
        />
      </Card>
    </Space>
  );
};

export default GenerationLogs;
