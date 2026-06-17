import React, { useEffect, useState } from 'react';
import { Card, Typography, Space, Spin, Table, Tag, Button } from '@douyinfe/semi-ui';
import {
  Users,
  Coins,
  Image,
  TrendingDown,
  ArrowUpRight,
  Clock,
  Activity,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;

interface DashboardStats {
  totalUsers: number;
  totalIssued: number;
  todayGenerations: number;
  totalPointsConsumed: number;
  totalPoints?: number;
  totalUsed?: number;
}

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

interface SystemStatus {
  channelCount: number;
  codeCount: number;
  activeCodeCount: number;
  totalGenerations: number;
}

const statCards = [
  {
    key: 'totalUsers',
    title: '用户总数',
    subtitle: '累计注册用户',
    icon: Users,
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#60a5fa',
  },
  {
    key: 'totalIssued',
    title: '总积分发放',
    subtitle: '累计发放积分',
    icon: Coins,
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#34d399',
  },
  {
    key: 'todayGenerations',
    title: '今日生图',
    subtitle: '24小时内生成次数',
    icon: Image,
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#fbbf24',
  },
  {
    key: 'totalUsed',
    title: '总积分消耗',
    subtitle: '累计消耗积分',
    icon: TrendingDown,
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#f87171',
  },
];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<GenerationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data.data);
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/admin/logs/generations', { params: { size: 5 } });
      const data = res.data.data || {};
      const list = Array.isArray(data) ? data : data?.list || data?.logs || [];
      setRecentLogs(list.slice(0, 5));
    } catch {
      // fallback to empty
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    setStatusLoading(true);
    try {
      const [channelsRes, codesRes] = await Promise.all([
        api.get('/admin/channels'),
        api.get('/admin/codes'),
      ]);
      const channels = Array.isArray(channelsRes.data.data)
        ? channelsRes.data.data
        : channelsRes.data.data?.list || [];
      const codes = Array.isArray(codesRes.data.data)
        ? codesRes.data.data
        : codesRes.data.data?.list || [];
      setSystemStatus({
        channelCount: channels.length,
        codeCount: codes.length,
        activeCodeCount: codes.filter((c: any) => c.status === 'active').length,
        totalGenerations: stats?.todayGenerations || 0,
      });
    } catch {
      // fallback
    } finally {
      setStatusLoading(false);
    }
  };

  const refreshAll = () => {
    setLoading(true);
    setLogsLoading(true);
    setStatusLoading(true);
    fetchStats();
    fetchRecentLogs();
    fetchSystemStatus();
  };

  useEffect(() => {
    fetchStats();
    fetchRecentLogs();
  }, []);

  useEffect(() => {
    if (stats) {
      fetchSystemStatus();
    }
  }, [stats]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Space vertical spacing="loose" style={{ width: '100%' }}>
      {/* 页面标题 */}
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
        <div>
          <Title heading={3} style={{ color: 'var(--text-primary)', margin: 0, fontSize: 24 }}>
            数据概览
          </Title>
          <Text style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            实时监控平台运营数据与系统状态
          </Text>
        </div>
        <Button
          theme="borderless"
          icon={<RefreshCw size={16} />}
          onClick={refreshAll}
          style={{
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
          }}
        >
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats?.[card.key as keyof DashboardStats] ?? 0;
          const displayValue =
            card.key.includes('Points') || card.key.includes('Issued') || card.key.includes('Used')
              ? (value / 100).toFixed(2)
              : value.toLocaleString();

          return (
            <div
              key={card.key}
              style={{
                background: card.gradient,
                borderRadius: 16,
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* 装饰圆圈 */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Icon size={26} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap' }}>
                    {card.title}
                  </span>
                  <span style={{ color: '#fff', fontSize: 32, lineHeight: 1.2, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {displayValue}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 4, whiteSpace: 'nowrap' }}>
                    {card.subtitle}
                  </span>
                </div>
                <ArrowUpRight
                  size={20}
                  style={{ color: 'rgba(255, 255, 255, 0.3)', flexShrink: 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 下方双列区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 8 }}>
        {/* 最近生图记录 */}
        <Card
          style={{
            backgroundColor: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
          }}
          bodyStyle={{ padding: '20px 24px' }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} style={{ color: 'var(--accent-blue)' }} />
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>
                最近生图记录
              </Text>
            </div>
          }
        >
          {logsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin size="small" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Text style={{ color: 'var(--text-muted)' }}>暂无记录</Text>
            </div>
          ) : (
            <Table
              columns={[
                {
                  title: '时间',
                  dataIndex: 'created_at',
                  width: 160,
                  render: (val: string) => (
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {new Date(val).toLocaleString()}
                    </Text>
                  ),
                },
                {
                  title: '用户',
                  dataIndex: 'user',
                  width: 120,
                  render: (_: any, record: GenerationLog) => {
                    const machineId = record.user?.machine_id || '';
                    return (
                      <Text
                        style={{
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: 13,
                        }}
                      >
                        {machineId ? `${machineId.slice(0, 12)}...` : '-'}
                      </Text>
                    );
                  },
                },
                {
                  title: '渠道',
                  dataIndex: 'channel',
                  width: 100,
                  render: (_: any, record: GenerationLog) => (
                    <Tag color="blue" size="small">
                      {record.channel?.name || '-'}
                    </Tag>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 80,
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
                {
                  title: '消耗',
                  dataIndex: 'points_cost',
                  width: 80,
                  render: (val: number | null) => {
                    const cost = typeof val === 'number' ? val : 0;
                    return (
                      <Text strong style={{ color: 'var(--accent-red)', fontSize: 13 }}>
                        {(cost / 100).toFixed(2)}
                      </Text>
                    );
                  },
                },
              ]}
              dataSource={recentLogs}
              pagination={false}
              rowKey="id"
              size="small"
            />
          )}
        </Card>

        {/* 系统状态 */}
        <Card
          style={{
            backgroundColor: 'var(--bg-card-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: 16,
          }}
          bodyStyle={{ padding: '20px 24px' }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={18} style={{ color: 'var(--accent-green)' }} />
              <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>
                系统状态
              </Text>
            </div>
          }
        >
          {statusLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin size="small" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                {
                  label: '渠道数量',
                  value: systemStatus?.channelCount ?? 0,
                  color: 'var(--accent-blue)',
                  icon: Activity,
                },
                {
                  label: '兑换码总数',
                  value: systemStatus?.codeCount ?? 0,
                  color: 'var(--accent-purple)',
                  icon: Coins,
                },
                {
                  label: '有效兑换码',
                  value: systemStatus?.activeCodeCount ?? 0,
                  color: 'var(--accent-green)',
                  icon: Activity,
                },
                {
                  label: '今日生成',
                  value: systemStatus?.totalGenerations ?? 0,
                  color: 'var(--accent-orange)',
                  icon: Image,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: 12,
                      padding: 16,
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: `${item.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} style={{ color: item.color }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Space>
  );
};

export default Dashboard;
