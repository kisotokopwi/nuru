import React, { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Space,
  Statistic,
  message,
} from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from 'react-query';
import { reportService } from '../../services/reportService';
import { siteService } from '../../services/siteService';
import { companyService } from '../../services/companyService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const Reports = () => {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const { user: currentUser } = useAuth();

  const { data: sitesData } = useQuery(
    ['sites'],
    () => siteService.getSites(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin',
    }
  );

  const { data: companiesData } = useQuery(
    ['companies'],
    () => companyService.getCompanies(),
    {
      enabled: currentUser?.role === 'super_admin',
    }
  );

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    ['dashboard'],
    () => reportService.getDashboardData(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin',
    }
  );

  const handleExportReport = (type) => {
    message.info(`Exporting ${type} report...`);
  };

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'site_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Access Denied</Title>
        <Text type="secondary">You don't have permission to access this page.</Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Reports & Analytics</Title>
            <Text type="secondary">Comprehensive reporting and analytics dashboard</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExportReport('comprehensive')}
              >
                Export Report
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={6}>
            <Space>
              <Text strong>Date Range:</Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Text strong>Site:</Text>
              <Select
                value={selectedSite}
                onChange={setSelectedSite}
                placeholder="All sites"
                style={{ width: '100%' }}
                allowClear
              >
                {sitesData?.data?.sites?.map((site) => (
                  <Option key={site.id} value={site.id}>
                    {site.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Space>
              <Text strong>Company:</Text>
              <Select
                value={selectedCompany}
                onChange={setSelectedCompany}
                placeholder="All companies"
                style={{ width: '100%' }}
                allowClear
              >
                {companiesData?.data?.companies?.map((company) => (
                  <Option key={company.id} value={company.id}>
                    {company.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={6}>
            <Button onClick={() => {
              setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
              setSelectedSite(null);
              setSelectedCompany(null);
            }}>
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Dashboard Overview */}
      {dashboardLoading ? (
        <LoadingSpinner tip="Loading dashboard data..." />
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Sites"
                value={dashboardData?.data?.totalSites || 0}
                prefix={<EnvironmentOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Active Projects"
                value={dashboardData?.data?.activeProjects || 0}
                prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Workers"
                value={dashboardData?.data?.totalWorkers || 0}
                prefix={<TeamOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Payments"
                value={dashboardData?.data?.totalPayments || 0}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Sample Chart */}
      <Card title="Sample Analytics Chart">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={[
            { name: 'Week 1', workers: 45, payments: 675000 },
            { name: 'Week 2', workers: 52, payments: 780000 },
            { name: 'Week 3', workers: 48, payments: 720000 },
            { name: 'Week 4', workers: 55, payments: 825000 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="workers" fill="#1890ff" name="Workers" />
            <Bar dataKey="payments" fill="#52c41a" name="Payments (TZS)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Reports;