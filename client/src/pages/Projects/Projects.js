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
  ProjectOutlined,
  EnvironmentOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import moment from 'moment';
import ProjectModal from './ProjectModal';
import ProjectDetails from './ProjectDetails';
import './Projects.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const Projects = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projectsData, isLoading, error } = useQuery(
    ['projects', currentPage, pageSize, searchText, statusFilter],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter
      };
      const response = await axios.get('/api/projects', { params });
      return response.data;
    }
  );

  // Create project mutation
  const createProjectMutation = useMutation(
    async (projectData) => {
      const response = await axios.post('/api/projects', projectData);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Project created successfully');
        queryClient.invalidateQueries('projects');
        setIsModalVisible(false);
        setEditingProject(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to create project');
      }
    }
  );

  // Update project mutation
  const updateProjectMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/projects/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Project updated successfully');
        queryClient.invalidateQueries('projects');
        setIsModalVisible(false);
        setEditingProject(null);
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to update project');
      }
    }
  );

  // Delete project mutation
  const deleteProjectMutation = useMutation(
    async (id) => {
      const response = await axios.delete(`/api/projects/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        message.success('Project deleted successfully');
        queryClient.invalidateQueries('projects');
      },
      onError: (error) => {
        message.error(error.response?.data?.error || 'Failed to delete project');
      }
    }
  );

  const handleCreate = () => {
    setEditingProject(null);
    setIsModalVisible(true);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setIsModalVisible(true);
  };

  const handleView = (project) => {
    setSelectedProject(project);
    setIsDetailsVisible(true);
  };

  const handleDelete = (id) => {
    deleteProjectMutation.mutate(id);
  };

  const handleModalSubmit = (values) => {
    if (editingProject) {
      updateProjectMutation.mutate({
        id: editingProject.id,
        data: values
      });
    } else {
      createProjectMutation.mutate(values);
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

  const handleRefresh = () => {
    queryClient.invalidateQueries('projects');
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      title: 'Client Company',
      dataIndex: 'client_company',
      key: 'client_company',
      sorter: (a, b) => a.client_company.localeCompare(b.client_company),
    },
    {
      title: 'Sites',
      dataIndex: 'site_count',
      key: 'site_count',
      align: 'center',
      sorter: (a, b) => a.site_count - b.site_count,
      render: (count) => (
        <Badge 
          count={count} 
          style={{ backgroundColor: '#52c41a' }}
          showZero
        />
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
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
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Project">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this project?"
            description="This action cannot be undone. All associated sites will be affected."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete Project">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteProjectMutation.isLoading}
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
        <Text type="danger">Failed to load projects. Please try again.</Text>
        <Button onClick={handleRefresh} style={{ marginLeft: 16 }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="page-title">
              <ProjectOutlined /> Projects
            </Title>
            <Text type="secondary">
              Manage client projects and their associated sites
            </Text>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              loading={createProjectMutation.isLoading}
            >
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} className="summary-cards">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Projects"
              value={projectsData?.pagination?.totalItems || 0}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Active Projects"
              value={projectsData?.projects?.filter(p => p.is_active).length || 0}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <Statistic
              title="Total Sites"
              value={projectsData?.projects?.reduce((sum, p) => sum + p.site_count, 0) || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Search */}
      <Card className="filters-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search projects..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchText('')}
              prefix={<SearchOutlined />}
            />
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
          <Col xs={24} sm={24} md={10}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
              <Text type="secondary">
                Showing {projectsData?.projects?.length || 0} of {projectsData?.pagination?.totalItems || 0} projects
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Projects Table */}
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={projectsData?.projects || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: projectsData?.pagination?.totalItems || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} projects`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* Project Modal */}
      <ProjectModal
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProject(null);
        }}
        onSubmit={handleModalSubmit}
        project={editingProject}
        loading={createProjectMutation.isLoading || updateProjectMutation.isLoading}
      />

      {/* Project Details Modal */}
      <ProjectDetails
        visible={isDetailsVisible}
        onCancel={() => {
          setIsDetailsVisible(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
      />
    </div>
  );
};

export default Projects;