import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Table, 
  Typography, 
  Alert, 
  Spin,
  Button,
  DatePicker,
  Select,
  Space,
  Tag,
  Progress
} from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  DollarOutlined,
  TrendingUpOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import moment from 'moment';
import './Dashboard.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const { user, isSuperAdmin, isSiteAdmin } = useAuth();
  const [dateRange, setDateRange] = useState([
    moment().subtract(7, 'days'),
    moment()
  ]);
  const [selectedSite, setSelectedSite] = useState('');

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery(
    ['dashboard', dateRange, selectedSite],
    async () => {
      const params = {
        start_date: dateRange[0].format('YYYY-MM-DD'),
        end_date: dateRange[1].format('YYYY-MM-DD')
      };
      
      if (selectedSite) {
        params.site_id = selectedSite;
      }

      const response = await axios.get('/api/reports/dashboard', { params });
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000, // Consider data stale after 10 seconds
    }
  );

  // Fetch sites for filter
  const { data: sitesData } = useQuery(
    'sites',
    async () => {
      const response = await axios.get('/api/sites', {
        params: { limit: 100, status: 'active' }
      });
      return response.data.sites;
    },
    {
      enabled: isSiteAdmin()
    }
  );

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setDateRange(dates);
    }
  };

  const handleSiteChange = (value) => {
    setSelectedSite(value);
  };

  // Get status color for records
  const getStatusColor = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (recordDate === today) {
      return 'success';
    } else if (moment(recordDate).isAfter(today)) {
      return 'warning';
    } else {
      return 'default';
    }
  };

  // Get status icon for records
  const getStatusIcon = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (recordDate === today) {
      return <CheckCircleOutlined />;
    } else if (moment(recordDate).isAfter(today)) {
      return <ClockCircleOutlined />;
    } else {
      return <FileTextOutlined />;
    }
  };

  // Recent activity columns
  const recentActivityColumns = [
    {
      title: 'Date',
      dataIndex: 'record_date',
      key: 'record_date',
      render: (date) => moment(date).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.record_date).unix() - moment(b.record_date).unix(),
    },
    {
      title: 'Site',
      dataIndex: 'site_name',
      key: 'site_name',
    },
    {
      title: 'Client',
      dataIndex: 'client_company',
      key: 'client_company',
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
    },
    {
      title: 'Workers',
      dataIndex: 'worker_count',
      key: 'worker_count',
      align: 'center',
      render: (count) => (
        <Tag color="blue" icon={<UserOutlined />}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'total_payment',
      key: 'total_payment',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#27ae60' }}>
          {new Intl.NumberFormat('en-TZ', {
            style: 'currency',
            currency: 'TZS',
            minimumFractionDigits: 0
          }).format(amount)}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record)} icon={getStatusIcon(record)}>
          {moment(record.record_date).format('DD/MM/YYYY') === moment().format('DD/MM/YYYY') ? 'Today' : 
           moment(record.record_date).isAfter(moment()) ? 'Future' : 'Past'}
        </Tag>
      ),
    },
  ];

  // Missing entries columns
  const missingEntriesColumns = [
    {
      title: 'Site',
      dataIndex: 'site_name',
      key: 'site_name',
    },
    {
      title: 'Client',
      dataIndex: 'client_company',
      key: 'client_company',
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => {
            // Navigate to daily records with pre-filled site
            window.location.href = `/records?site_id=${record.id}&date=${moment().format('YYYY-MM-DD')}`;
          }}
        >
          Add Record
        </Button>
      ),
    },
  ];

  if (error) {
    return (
      <div className="dashboard-container">
        <Alert
          message="Error Loading Dashboard"
          description="Failed to load dashboard data. Please try again."
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="dashboard-title">
              Welcome back, {user?.full_name}!
            </Title>
            <Text className="dashboard-subtitle">
              Here's what's happening with your operations today.
            </Text>
          </div>
          <div className="header-actions">
            <Space>
              {isSiteAdmin() && (
                <Select
                  placeholder="Filter by site"
                  style={{ width: 200 }}
                  allowClear
                  value={selectedSite}
                  onChange={handleSiteChange}
                >
                  {sitesData?.map(site => (
                    <Option key={site.id} value={site.id}>
                      {site.name}
                    </Option>
                  ))}
                </Select>
              )}
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                placeholder={['Start Date', 'End Date']}
              />
              <Button 
                type="primary" 
                icon={<TrendingUpOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <Spin size="large" />
          <Text>Loading dashboard data...</Text>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} className="summary-cards">
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Today's Records"
                  value={dashboardData?.today?.records_count || 0}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <div className="stat-footer">
                  <Text type="secondary">
                    {dashboardData?.today?.active_sites || 0} active sites
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Total Workers Today"
                  value={dashboardData?.today?.total_workers || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div className="stat-footer">
                  <Text type="secondary">
                    Across all sites
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Total Payments Today"
                  value={dashboardData?.today?.total_payments || 0}
                  prefix={<DollarOutlined />}
                  precision={0}
                  valueStyle={{ color: '#fa8c16' }}
                  formatter={(value) => new Intl.NumberFormat('en-TZ', {
                    style: 'currency',
                    currency: 'TZS',
                    minimumFractionDigits: 0
                  }).format(value)}
                />
                <div className="stat-footer">
                  <Text type="secondary">
                    Daily total
                  </Text>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Missing Entries"
                  value={dashboardData?.missing_entries?.length || 0}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
                <div className="stat-footer">
                  <Text type="secondary">
                    Sites without today's record
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Weekly and Monthly Summary */}
          <Row gutter={[16, 16]} className="period-summary">
            <Col xs={24} lg={12}>
              <Card title="This Week" className="period-card">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Records"
                      value={dashboardData?.this_week?.records_count || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Total Workers"
                      value={dashboardData?.this_week?.total_workers || 0}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Statistic
                      title="Total Payments"
                      value={dashboardData?.this_week?.total_payments || 0}
                      precision={0}
                      valueStyle={{ color: '#fa8c16' }}
                      formatter={(value) => new Intl.NumberFormat('en-TZ', {
                        style: 'currency',
                        currency: 'TZS',
                        minimumFractionDigits: 0
                      }).format(value)}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Avg Production"
                      value={dashboardData?.this_week?.avg_production || 0}
                      precision={1}
                      suffix="tons"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card title="This Month" className="period-card">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Records"
                      value={dashboardData?.this_month?.records_count || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Active Sites"
                      value={dashboardData?.this_month?.active_sites || 0}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Statistic
                      title="Total Workers"
                      value={dashboardData?.this_month?.total_workers || 0}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Active Supervisors"
                      value={dashboardData?.this_month?.active_supervisors || 0}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Recent Activity and Missing Entries */}
          <Row gutter={[16, 16]} className="activity-section">
            <Col xs={24} lg={16}>
              <Card 
                title="Recent Activity" 
                className="activity-card"
                extra={
                  <Button 
                    type="link" 
                    onClick={() => window.location.href = '/records'}
                  >
                    View All
                  </Button>
                }
              >
                <Table
                  columns={recentActivityColumns}
                  dataSource={dashboardData?.recent_activity || []}
                  rowKey="record_date"
                  pagination={{ pageSize: 5, size: 'small' }}
                  size="small"
                  scroll={{ x: 600 }}
                />
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card 
                title="Missing Entries" 
                className="missing-entries-card"
                extra={
                  <Tag color="red" icon={<WarningOutlined />}>
                    {dashboardData?.missing_entries?.length || 0}
                  </Tag>
                }
              >
                {dashboardData?.missing_entries?.length > 0 ? (
                  <Table
                    columns={missingEntriesColumns}
                    dataSource={dashboardData.missing_entries}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    showHeader={false}
                  />
                ) : (
                  <div className="no-missing-entries">
                    <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    <Text type="secondary">All sites have today's records!</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;