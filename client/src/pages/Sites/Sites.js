import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { siteService } from '../../services/siteService';
import { companyService } from '../../services/companyService';
import { projectService } from '../../services/projectService';
import { userService } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Sites = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isSupervisorModalVisible, setIsSupervisorModalVisible] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form] = Form.useForm();
  const [supervisorForm] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: sitesData, isLoading, error, refetch } = useQuery(
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

  const { data: projectsData } = useQuery(
    ['projects'],
    () => projectService.getProjects(),
    {
      enabled: currentUser?.role === 'super_admin',
    }
  );

  const { data: supervisorsData } = useQuery(
    ['supervisors'],
    () => userService.getUsers({ role: 'supervisor' }),
    {
      enabled: currentUser?.role === 'super_admin',
    }
  );

  const createSiteMutation = useMutation(siteService.createSite, {
    onSuccess: () => {
      message.success('Site created successfully');
      queryClient.invalidateQueries(['sites']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to create site');
    },
  });

  const updateSiteMutation = useMutation(
    ({ id, data }) => siteService.updateSite(id, data),
    {
      onSuccess: () => {
        message.success('Site updated successfully');
        queryClient.invalidateQueries(['sites']);
        setIsModalVisible(false);
        setEditingSite(null);
        form.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update site');
      },
    }
  );

  const deleteSiteMutation = useMutation(siteService.deleteSite, {
    onSuccess: () => {
      message.success('Site deleted successfully');
      queryClient.invalidateQueries(['sites']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete site');
    },
  });

  const assignSupervisorMutation = useMutation(
    ({ siteId, supervisorId }) => siteService.assignSupervisor(siteId, supervisorId),
    {
      onSuccess: () => {
        message.success('Supervisor assigned successfully');
        queryClient.invalidateQueries(['sites']);
        setIsSupervisorModalVisible(false);
        supervisorForm.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to assign supervisor');
      },
    }
  );

  const removeSupervisorMutation = useMutation(siteService.removeSupervisor, {
    onSuccess: () => {
      message.success('Supervisor removed successfully');
      queryClient.invalidateQueries(['sites']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to remove supervisor');
    },
  });

  const handleCreateSite = () => {
    setEditingSite(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditSite = (site) => {
    setEditingSite(site);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: site.name,
      projectId: site.projectId,
      location: site.location,
      description: site.description,
      status: site.status,
    });
  };

  const handleViewSite = (site) => {
    setSelectedSite(site);
    setIsDetailModalVisible(true);
  };

  const handleDeleteSite = (siteId) => {
    deleteSiteMutation.mutate(siteId);
  };

  const handleAssignSupervisor = (site) => {
    setSelectedSite(site);
    setIsSupervisorModalVisible(true);
    supervisorForm.resetFields();
  };

  const handleRemoveSupervisor = (siteId) => {
    removeSupervisorMutation.mutate(siteId);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingSite) {
        updateSiteMutation.mutate({ id: editingSite.id, data: values });
      } else {
        createSiteMutation.mutate(values);
      }
    });
  };

  const handleSupervisorModalOk = () => {
    supervisorForm.validateFields().then((values) => {
      assignSupervisorMutation.mutate({
        siteId: selectedSite.id,
        supervisorId: values.supervisorId,
      });
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'red';
      case 'completed':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Site Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <EnvironmentOutlined />
          <span>{text}</span>
        </Space>
      ),
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisorName',
      key: 'supervisorName',
      render: (supervisorName, record) => (
        supervisorName ? (
          <Space>
            <UserOutlined />
            <span>{supervisorName}</span>
          </Space>
        ) : (
          <Text type="secondary">Not Assigned</Text>
        )
      ),
    },
    {
      title: 'Worker Types',
      dataIndex: 'workerTypeCount',
      key: 'workerTypeCount',
      render: (count) => (
        <Space>
          <TeamOutlined />
          <span>{count}</span>
        </Space>
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
              onClick={() => handleViewSite(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Site">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditSite(record)}
            />
          </Tooltip>
          <Tooltip title="Assign Supervisor">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => handleAssignSupervisor(record)}
            />
          </Tooltip>
          {record.assignedSupervisorId && (
            <Popconfirm
              title="Are you sure you want to remove the supervisor?"
              onConfirm={() => handleRemoveSupervisor(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Remove Supervisor">
                <Button
                  type="text"
                  danger
                  icon={<UserOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm
            title="Are you sure you want to delete this site?"
            onConfirm={() => handleDeleteSite(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Site">
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
    return <LoadingSpinner tip="Loading sites..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Sites</Title>
        <Text type="secondary">Failed to load sites. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const sites = sitesData?.data?.sites || [];
  const stats = sitesData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Site Management</Title>
            <Text type="secondary">Manage project sites and supervisor assignments</Text>
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
                  onClick={handleCreateSite}
                >
                  Add Site
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
              title="Total Sites"
              value={stats.total || 0}
              prefix={<EnvironmentOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Sites"
              value={sites.filter(s => s.status === 'active').length}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Sites with Supervisors"
              value={sites.filter(s => s.assignedSupervisorId).length}
              prefix={<UserOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Sites Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={sites}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} sites`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create/Edit Site Modal */}
      <Modal
        title={editingSite ? 'Edit Site' : 'Create New Site'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingSite(null);
          form.resetFields();
        }}
        confirmLoading={createSiteMutation.isLoading || updateSiteMutation.isLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
          }}
        >
          <Form.Item
            name="name"
            label="Site Name"
            rules={[
              { required: true, message: 'Please input site name!' },
              { min: 2, message: 'Site name must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="Enter site name" />
          </Form.Item>

          <Form.Item
            name="projectId"
            label="Project"
            rules={[{ required: true, message: 'Please select a project!' }]}
          >
            <Select placeholder="Select project">
              {projectsData?.data?.projects?.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.name} - {project.companyName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
            rules={[
              { required: true, message: 'Please input location!' },
              { min: 2, message: 'Location must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="Enter site location" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              placeholder="Enter site description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status!' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Site Details Modal */}
      <Modal
        title="Site Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedSite(null);
        }}
        footer={null}
        width={800}
      >
        {selectedSite && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Site Name" span={2}>
              {selectedSite.name}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {selectedSite.location}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedSite.status)}>
                {selectedSite.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Project">
              {selectedSite.projectName}
            </Descriptions.Item>
            <Descriptions.Item label="Company">
              {selectedSite.companyName}
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor" span={2}>
              {selectedSite.supervisorName ? (
                <Space>
                  <UserOutlined />
                  <span>{selectedSite.supervisorName}</span>
                </Space>
              ) : (
                <Text type="secondary">Not Assigned</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Worker Types">
              {selectedSite.workerTypeCount}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedSite.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            {selectedSite.description && (
              <Descriptions.Item label="Description" span={2}>
                {selectedSite.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Assign Supervisor Modal */}
      <Modal
        title="Assign Supervisor"
        open={isSupervisorModalVisible}
        onOk={handleSupervisorModalOk}
        onCancel={() => {
          setIsSupervisorModalVisible(false);
          setSelectedSite(null);
          supervisorForm.resetFields();
        }}
        confirmLoading={assignSupervisorMutation.isLoading}
        width={500}
      >
        <Form
          form={supervisorForm}
          layout="vertical"
        >
          <Form.Item
            name="supervisorId"
            label="Select Supervisor"
            rules={[{ required: true, message: 'Please select a supervisor!' }]}
          >
            <Select placeholder="Select supervisor">
              {supervisorsData?.data?.users?.map((supervisor) => (
                <Option key={supervisor.id} value={supervisor.id}>
                  {supervisor.firstName} {supervisor.lastName}
                  {supervisor.assignedSite && (
                    <Text type="secondary"> (Currently assigned to {supervisor.assignedSite.name})</Text>
                  )}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Sites;