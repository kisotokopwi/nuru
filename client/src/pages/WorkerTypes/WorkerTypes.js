import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { workerTypeService } from '../../services/workerTypeService';
import { siteService } from '../../services/siteService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const WorkerTypes = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingWorkerType, setEditingWorkerType] = useState(null);
  const [selectedWorkerType, setSelectedWorkerType] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: workerTypesData, isLoading, error, refetch } = useQuery(
    ['workerTypes'],
    () => workerTypeService.getWorkerTypes(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin',
    }
  );

  const { data: sitesData } = useQuery(
    ['sites'],
    () => siteService.getSites(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin',
    }
  );

  const createWorkerTypeMutation = useMutation(workerTypeService.createWorkerType, {
    onSuccess: () => {
      message.success('Worker type created successfully');
      queryClient.invalidateQueries(['workerTypes']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to create worker type');
    },
  });

  const updateWorkerTypeMutation = useMutation(
    ({ id, data }) => workerTypeService.updateWorkerType(id, data),
    {
      onSuccess: () => {
        message.success('Worker type updated successfully');
        queryClient.invalidateQueries(['workerTypes']);
        setIsModalVisible(false);
        setEditingWorkerType(null);
        form.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update worker type');
      },
    }
  );

  const deleteWorkerTypeMutation = useMutation(workerTypeService.deleteWorkerType, {
    onSuccess: () => {
      message.success('Worker type deleted successfully');
      queryClient.invalidateQueries(['workerTypes']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete worker type');
    },
  });

  const handleCreateWorkerType = () => {
    setEditingWorkerType(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditWorkerType = (workerType) => {
    setEditingWorkerType(workerType);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: workerType.name,
      description: workerType.description,
      dailyRate: workerType.dailyRate,
      siteId: workerType.siteId,
      isActive: workerType.isActive,
    });
  };

  const handleViewWorkerType = (workerType) => {
    setSelectedWorkerType(workerType);
    setIsDetailModalVisible(true);
  };

  const handleDeleteWorkerType = (workerTypeId) => {
    deleteWorkerTypeMutation.mutate(workerTypeId);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingWorkerType) {
        updateWorkerTypeMutation.mutate({ id: editingWorkerType.id, data: values });
      } else {
        createWorkerTypeMutation.mutate(values);
      }
    });
  };

  const columns = [
    {
      title: 'Worker Type',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <TeamOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Site',
      dataIndex: 'siteName',
      key: 'siteName',
      render: (siteName) => (
        <Space>
          <EnvironmentOutlined />
          <span>{siteName}</span>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (description) => description ? (
        <Tooltip title={description}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {description}
          </Text>
        </Tooltip>
      ) : '-',
    },
    {
      title: 'Daily Rate',
      dataIndex: 'dailyRate',
      key: 'dailyRate',
      render: (rate) => (
        <Space>
          <DollarOutlined />
          <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
            {formatCurrency(rate)}
          </span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewWorkerType(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Worker Type">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditWorkerType(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this worker type?"
            onConfirm={() => handleDeleteWorkerType(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Worker Type">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'site_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Access Denied</Title>
        <Text type="secondary">You don't have permission to access this page.</Text>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner tip="Loading worker types..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Worker Types</Title>
        <Text type="secondary">Failed to load worker types. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const workerTypes = workerTypesData?.data?.workerTypes || [];
  const stats = workerTypesData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Worker Types Management</Title>
            <Text type="secondary">Manage worker types and their daily rates</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
              >
                Refresh
              </Button>
              {currentUser?.role === 'super_admin' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateWorkerType}
                >
                  Add Worker Type
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Worker Types"
              value={stats.total || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Types"
              value={workerTypes.filter(wt => wt.isActive).length}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Rate"
              value={workerTypes.length > 0 ? 
                Math.round(workerTypes.reduce((sum, wt) => sum + wt.dailyRate, 0) / workerTypes.length) : 0
              }
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
              suffix="TZS"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Worker Types Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={workerTypes}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} worker types`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create/Edit Worker Type Modal */}
      <Modal
        title={editingWorkerType ? 'Edit Worker Type' : 'Create New Worker Type'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingWorkerType(null);
          form.resetFields();
        }}
        confirmLoading={createWorkerTypeMutation.isLoading || updateWorkerTypeMutation.isLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            isActive: true,
          }}
        >
          <Form.Item
            name="name"
            label="Worker Type Name"
            rules={[
              { required: true, message: 'Please input worker type name!' },
              { min: 2, message: 'Worker type name must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="e.g., Skilled Worker, Cleaning Worker" />
          </Form.Item>

          <Form.Item
            name="siteId"
            label="Site"
            rules={[{ required: true, message: 'Please select a site!' }]}
          >
            <Select placeholder="Select site">
              {sitesData?.data?.sites?.map((site) => (
                <Option key={site.id} value={site.id}>
                  {site.name} - {site.location}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              placeholder="Enter worker type description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="dailyRate"
            label="Daily Rate (TZS)"
            rules={[
              { required: true, message: 'Please input daily rate!' },
              { type: 'number', min: 1, message: 'Daily rate must be greater than 0!' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter daily rate"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={1}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            rules={[{ required: true, message: 'Please select status!' }]}
          >
            <Select placeholder="Select status">
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Worker Type Details Modal */}
      <Modal
        title="Worker Type Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedWorkerType(null);
        }}
        footer={null}
        width={600}
      >
        {selectedWorkerType && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Worker Type Name">
              {selectedWorkerType.name}
            </Descriptions.Item>
            <Descriptions.Item label="Site">
              {selectedWorkerType.siteName}
            </Descriptions.Item>
            <Descriptions.Item label="Daily Rate">
              <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                {formatCurrency(selectedWorkerType.dailyRate)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedWorkerType.isActive ? 'green' : 'red'}>
                {selectedWorkerType.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {selectedWorkerType.createdBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedWorkerType.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            {selectedWorkerType.description && (
              <Descriptions.Item label="Description">
                {selectedWorkerType.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default WorkerTypes;