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
  DatePicker,
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
  ProjectOutlined,
  ReloadOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { projectService } from '../../services/projectService';
import { companyService } from '../../services/companyService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Projects = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading, error, refetch } = useQuery(
    ['projects'],
    () => projectService.getProjects(),
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

  const createProjectMutation = useMutation(projectService.createProject, {
    onSuccess: () => {
      message.success('Project created successfully');
      queryClient.invalidateQueries(['projects']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to create project');
    },
  });

  const updateProjectMutation = useMutation(
    ({ id, data }) => projectService.updateProject(id, data),
    {
      onSuccess: () => {
        message.success('Project updated successfully');
        queryClient.invalidateQueries(['projects']);
        setIsModalVisible(false);
        setEditingProject(null);
        form.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update project');
      },
    }
  );

  const deleteProjectMutation = useMutation(projectService.deleteProject, {
    onSuccess: () => {
      message.success('Project deleted successfully');
      queryClient.invalidateQueries(['projects']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete project');
    },
  });

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      startDate: project.startDate ? dayjs(project.startDate) : null,
      endDate: project.endDate ? dayjs(project.endDate) : null,
      status: project.status,
    });
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setIsDetailModalVisible(true);
  };

  const handleDeleteProject = (projectId) => {
    deleteProjectMutation.mutate(projectId);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const formattedValues = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
      };
      
      if (editingProject) {
        updateProjectMutation.mutate({ id: editingProject.id, data: formattedValues });
      } else {
        createProjectMutation.mutate(formattedValues);
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'completed':
        return 'blue';
      case 'suspended':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <ProjectOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (companyName) => (
        <Space>
          <BankOutlined />
          <span>{companyName}</span>
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
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Sites',
      dataIndex: 'siteCount',
      key: 'siteCount',
      render: (count) => (
        <Space>
          <EnvironmentOutlined />
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
              onClick={() => handleViewProject(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Project">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this project?"
            onConfirm={() => handleDeleteProject(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Project">
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
    return <LoadingSpinner tip="Loading projects..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Projects</Title>
        <Text type="secondary">Failed to load projects. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const projects = projectsData?.data?.projects || [];
  const stats = projectsData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Project Management</Title>
            <Text type="secondary">Manage projects and their configurations</Text>
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
                  onClick={handleCreateProject}
                >
                  Add Project
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
              title="Total Projects"
              value={stats.total || 0}
              prefix={<ProjectOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Projects"
              value={projects.filter(p => p.status === 'active').length}
              prefix={<ProjectOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Sites"
              value={projects.reduce((sum, p) => sum + (p.siteCount || 0), 0)}
              prefix={<EnvironmentOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Projects Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} projects`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Create/Edit Project Modal */}
      <Modal
        title={editingProject ? 'Edit Project' : 'Create New Project'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProject(null);
          form.resetFields();
        }}
        confirmLoading={createProjectMutation.isLoading || updateProjectMutation.isLoading}
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
            label="Project Name"
            rules={[
              { required: true, message: 'Please input project name!' },
              { min: 2, message: 'Project name must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item
            name="companyId"
            label="Company"
            rules={[{ required: true, message: 'Please select a company!' }]}
          >
            <Select placeholder="Select company">
              {companiesData?.data?.companies?.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              placeholder="Enter project description"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select start date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="End Date"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select end date"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status!' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="completed">Completed</Option>
              <Option value="suspended">Suspended</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Project Details Modal */}
      <Modal
        title="Project Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedProject(null);
        }}
        footer={null}
        width={800}
      >
        {selectedProject && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Project Name" span={2}>
              {selectedProject.name}
            </Descriptions.Item>
            <Descriptions.Item label="Company">
              {selectedProject.companyName}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedProject.status)}>
                {selectedProject.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Start Date">
              {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Sites">
              {selectedProject.siteCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {selectedProject.createdBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedProject.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            {selectedProject.description && (
              <Descriptions.Item label="Description" span={2}>
                {selectedProject.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Projects;