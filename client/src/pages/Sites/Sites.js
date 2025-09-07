import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import moment from 'moment';
import SiteModal from './SiteModal';
import './Sites.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const Sites = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSite, setEditingSite] = useState(null);

  const queryClient = useQueryClient();

  // Fetch sites
  const { data: sitesData, isLoading, error } = useQuery(
    ['sites', currentPage, pageSize, searchText, statusFilter, projectFilter],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter
      };
      
      if (projectFilter) {
        params.project_id = projectFilter;
      }

      const response = await axios.get('/api/sites', { params });
      return response.data;
    }
  );

  // Fetch projects for filter
  const { data: projectsData } = useQuery(
    'projects',
    async () => {
      const response = await axios.get('/api/projects', {
        params: { limit: 100, status: 'active' }
      });
      return response.data.projects;
    }
  );

  // Create site mutation
  const createSiteMutation = useMutation(
    async (siteData) => {
      const response = await axios.post('/api/sites', siteData);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Site created successfully');
        queryClient.invalidateQueries('sites');
        setIsModalVisible(false);
        setEditingSite(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to create site');
      }
    }
  );

  // Update site mutation
  const updateSiteMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/sites/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Site updated successfully');
        queryClient.invalidateQueries('sites');
        setIsModalVisible(false);
        setEditingSite(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to update site');
      }
    }
  );

  // Delete site mutation
  const deleteSiteMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/sites/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Site deleted successfully');
        queryClient.invalidateQueries('sites');
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to delete site');
      }
    }
  );

  const handleCreate = () => {
    setEditingSite(null);
    setIsModalVisible(true);
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    deleteSiteMutation.mutate(id);
  };

  const handleModalSubmit = (values) => {
    if (editingSite) {
      updateSiteMutation.mutate({
        id: editingSite.id,
        data: values
      });
    } else {
      createSiteMutation.mutate(values);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleProjectFilter = (value) => {
    setProjectFilter(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries('sites');
  };

  const columns = [
    {
      title: 'Site Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </div>
      ),
    },
    {
      title: 'Project',
      dataIndex: 'project_name',
      key: 'project_name',
      sorter: (a, b) => a.project_name.localeCompare(b.project_name),
    },
    {
      title: 'Client',
      dataIndex: 'client_company',
      key: 'client_company',
      sorter: (a, b) => a.client_company.localeCompare(b.client_company),
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
      render: (text) => text || <Text type="secondary">Not assigned</Text>,
    },
    {
      title: 'Worker Types',
      dataIndex: 'worker_type_count',
      key: 'worker_type_count',
      align: 'center',
      sorter: (a, b) => a.worker_type_count - b.worker_type_count,
      render: (count) => (
        <Badge 
          count={count} 
          style={{ backgroundColor: '#52c41a' }}
          showZero
        />
      ),
    },
    {
      title: 'Created Date',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit Site">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this site?"
            description="This action cannot be undone. All associated records will be affected."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete Site">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteSiteMutation.isLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getStatusOptions = () => [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  if (error) {
    return (
      <div className="error-container">
        <Text type="danger">Failed to load sites. Please try again.</Text>
        <Button onClick={handleRefresh} style={{ marginLeft: 16 }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="sites-container">
      <div className="sites-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="page-title">
              <EnvironmentOutlined /> Sites
            </Title>
            <Text type="secondary">
              Manage physical locations and their configurations
            </Text>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={createSiteMutation.isLoading}
            >
              New Site
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Sites"
              value={sitesData?.pagination?.totalItems || 0}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Active Sites"
              value={sitesData?.sites?.filter(s => s.is_active).length || 0}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Assigned Supervisors"
              value={sitesData?.sites?.filter(s => s.supervisor_id).length || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="Search sites..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by project"
              value={projectFilter}
              onChange={handleProjectFilter}
              style={{ width: '100%' }}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              {projectsData?.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by status"
              value={statusFilter}
              onChange={handleStatusFilter}
              style={{ width: '100%' }}
              suffixIcon={<FilterOutlined />}
            >
              {getStatusOptions().map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
              <Text type="secondary">
                {sitesData?.sites?.length || 0} sites
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Sites Table */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={sitesData?.sites || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: sitesData?.pagination?.totalItems || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sites`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* Site Modal */}
      <SiteModal
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingSite(null);
        }}
        onSubmit={handleModalSubmit}
        site={editingSite}
        projects={projectsData}
        loading={createSiteMutation.isLoading || updateSiteMutation.isLoading}
      />
    </div>
  );
};

export default Sites;