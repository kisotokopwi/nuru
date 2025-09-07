import React from 'react';
import { Row, Col, Card, Statistic, Table, Alert, Typography, Space, Button } from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  ProjectOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: dashboardData, isLoading, error, refetch } = useQuery(
    ['dashboard', today],
    () => dashboardService.getDashboardData(today),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return <LoadingSpinner tip="Loading dashboard data..." />;
  }

  if (error) {
    return (
      <Alert
        message="Error loading dashboard"
        description="Failed to load dashboard data. Please try again."
        type="error"
        showIcon
        action={
          <Button size="small" danger onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const { todaySummary, missingRecords, recentActivity, topSites, companyPerformance } = dashboardData.data;

  const missingRecordsColumns = [
    {
      title: 'Site Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Project',
      dataIndex: 'projectName',
      key: 'projectName',
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisorName',
      key: 'supervisorName',
      render: (text) => text || <Text type="secondary">Not Assigned</Text>,
    },
  ];

  const recentActivityColumns = [
    {
      title: 'Date',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Records',
      dataIndex: 'recordsCount',
      key: 'recordsCount',
      align: 'center',
    },
    {
      title: 'Sites',
      dataIndex: 'sitesCount',
      key: 'sitesCount',
      align: 'center',
    },
    {
      title: 'Total Workers',
      dataIndex: 'totalWorkers',
      key: 'totalWorkers',
      align: 'center',
    },
    {
      title: 'Total Payments',
      dataIndex: 'totalPayments',
      key: 'totalPayments',
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>Dashboard</Title>
        <Text type="secondary">
          Welcome back, {user?.firstName}! Here's what's happening today.
        </Text>
      </div>

      {/* Today's Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Daily Records"
              value={todaySummary.totalRecords}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Sites"
              value={todaySummary.sitesWithRecords}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Workers"
              value={todaySummary.totalWorkers}
              prefix={<UserOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={todaySummary.totalPayments}
              prefix={<BankOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Missing Records Alert */}
      {missingRecords.length > 0 && (
        <Alert
          message={`${missingRecords.length} sites missing today's records`}
          description="Some sites haven't submitted their daily records yet."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              <ReloadOutlined /> Refresh
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        {/* Missing Records Table */}
        <Col xs={24} lg={12}>
          <Card
            title="Missing Records Today"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => refetch()}
                icon={<ReloadOutlined />}
              >
                Refresh
              </Button>
            }
          >
            {missingRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text type="success">All sites have submitted their records! 🎉</Text>
              </div>
            ) : (
              <Table
                dataSource={missingRecords}
                columns={missingRecordsColumns}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
                rowKey="id"
              />
            )}
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={12}>
          <Card
            title="Recent Activity (Last 7 Days)"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => refetch()}
                icon={<ReloadOutlined />}
              >
                Refresh
              </Button>
            }
          >
            <Table
              dataSource={recentActivity}
              columns={recentActivityColumns}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
              rowKey="workDate"
            />
          </Card>
        </Col>
      </Row>

      {/* Top Performing Sites */}
      {topSites.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="Top Performing Sites (Last 30 Days)">
              <Row gutter={[16, 16]}>
                {topSites.map((site, index) => (
                  <Col xs={24} sm={12} lg={8} key={site.id}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>#{index + 1} {site.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {site.location}
                          </Text>
                        </div>
                        <Row gutter={8}>
                          <Col span={12}>
                            <Statistic
                              title="Workers"
                              value={site.totalWorkers}
                              valueStyle={{ fontSize: 16 }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="Payments"
                              value={site.totalPayments}
                              formatter={(value) => formatCurrency(value)}
                              valueStyle={{ fontSize: 16 }}
                            />
                          </Col>
                        </Row>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {site.workDays} work days
                        </Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* Company Performance */}
      {companyPerformance.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card title="Company Performance (Last 30 Days)">
              <Row gutter={[16, 16]}>
                {companyPerformance.map((company) => (
                  <Col xs={24} sm={12} lg={8} key={company.id}>
                    <Card size="small" hoverable>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>{company.name}</Text>
                        </div>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Statistic
                              title="Projects"
                              value={company.projectCount}
                              valueStyle={{ fontSize: 14 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Sites"
                              value={company.siteCount}
                              valueStyle={{ fontSize: 14 }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="Workers"
                              value={company.totalWorkers}
                              valueStyle={{ fontSize: 14 }}
                            />
                          </Col>
                        </Row>
                        <Statistic
                          title="Total Payments"
                          value={company.totalPayments}
                          formatter={(value) => formatCurrency(value)}
                          valueStyle={{ fontSize: 16, color: '#1890ff' }}
                        />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;