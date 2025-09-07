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
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import moment from 'moment';
import WorkerTypeModal from './WorkerTypeModal';
import './Workers.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const Workers = () => {
  const [searchText, setSearchText] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingWorkerType, setEditingWorkerType] = useState(null);

  const queryClient = useQueryClient();

  // Fetch worker types
  const { data: workerTypesData, isLoading, error } = useQuery(
    ['worker-types', currentPage, pageSize, searchText, siteFilter],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText
      };
      
      if (siteFilter) {
        params.site_id = siteFilter;
      }

      const response = await axios.get('/api/worker-types', { params });
      return response.data;
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
    }
  );

  // Create worker type mutation
  const createWorkerTypeMutation = useMutation(
    async (workerTypeData) => {
      const response = await axios.post('/api/worker-types', workerTypeData);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Worker type created successfully');
        queryClient.invalidateQueries('worker-types');
        setIsModalVisible(false);
        setEditingWorkerType(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to create worker type');
      }
    }
  );

  // Update worker type mutation
  const updateWorkerTypeMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/worker-types/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Worker type updated successfully');
        queryClient.invalidateQueries('worker-types');
        setIsModalVisible(false);
        setEditingWorkerType(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to update worker type');
      }
    }
  );

  // Delete worker type mutation
  const deleteWorkerTypeMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/worker-types/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Worker type deleted successfully');
        queryClient.invalidateQueries('worker-types');
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to delete worker type');
      }
    }
  );

  const handleCreate = () => {
    setEditingWorkerType(null);
    setIsModalVisible(true);
  };

  const handleEdit = (workerType) => {
    setEditingWorkerType(workerType);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    deleteWorkerTypeMutation.mutate(id);
  };

  const handleModalSubmit = (values) => {
    if (editingWorkerType) {
      updateWorkerTypeMutation.mutate({
        id: editingWorkerType.id,
        data: values
      });
    } else {
      createWorkerTypeMutation.mutate(values);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleSiteFilter = (value) => {
    setSiteFilter(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries('worker-types');
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0
  }).format(amount);

  const columns = [
    {
      title: 'Worker Type',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Site',
      dataIndex: 'site_name',
      key: 'site_name',
      sorter: (a, b) => a.site_name.localeCompare(b.site_name),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.client_company}
          </Text>
        </div>
      ),
    },
    {
      title: 'Daily Rate',
      dataIndex: 'daily_rate',
      key: 'daily_rate',
      align: 'right',
      sorter: (a, b) => a.daily_rate - b.daily_rate,
      render: (rate) => (
        <Text strong style={{ color: '#27ae60' }}>
          {formatCurrency(rate)}
        </Text>
      ),
    },
    {
      title: 'Task Requirement',
      dataIndex: 'minimum_task_requirement',
      key: 'minimum_task_requirement',
      render: (requirement) => requirement || <Text type="secondary">Not specified</Text>,
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
          <Tooltip title="Edit Worker Type">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this worker type?"
            description="This action cannot be undone. All associated records will be affected."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete Worker Type">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteWorkerTypeMutation.isLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <div className="error-container">
        <Text type="danger">Failed to load worker types. Please try again.</Text>
        <Button onClick={handleRefresh} style={{ marginLeft: 16 }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="workers-container">
      <div className="workers-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="page-title">
              <TeamOutlined /> Worker Types
            </Title>
            <Text type="secondary">
              Manage worker categories and their daily rates
            </Text>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={createWorkerTypeMutation.isLoading}
            >
              New Worker Type
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Worker Types"
              value={workerTypesData?.pagination?.totalItems || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Active Types"
              value={workerTypesData?.worker_types?.filter(wt => wt.is_active).length || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Average Rate"
              value={workerTypesData?.worker_types?.reduce((sum, wt) => sum + wt.daily_rate, 0) / (workerTypesData?.worker_types?.length || 1) || 0}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search worker types..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filter by site"
              value={siteFilter}
              onChange={handleSiteFilter}
              style={{ width: '100%' }}
              allowClear
              suffixIcon={<FilterOutlined />}
            >
              {sitesData?.map(site => (
                <Option key={site.id} value={site.id}>
                  {site.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
              <Text type="secondary">
                {workerTypesData?.worker_types?.length || 0} types
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Worker Types Table */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={workerTypesData?.worker_types || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: workerTypesData?.pagination?.totalItems || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} worker types`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* Worker Type Modal */}
      <WorkerTypeModal
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingWorkerType(null);
        }}
        onSubmit={handleModalSubmit}
        workerType={editingWorkerType}
        sites={sitesData}
        loading={createWorkerTypeMutation.isLoading || updateWorkerTypeMutation.isLoading}
      />
    </div>
  );
};

export default Workers;