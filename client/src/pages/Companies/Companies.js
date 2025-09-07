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
  BankOutlined,
  ReloadOutlined,
  EyeOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { companyService } from '../../services/companyService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Companies = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: companiesData, isLoading, error, refetch } = useQuery(
    ['companies'],
    () => companyService.getCompanies(),
    {
      enabled: currentUser?.role === 'super_admin',
    }
  );

  const createCompanyMutation = useMutation(companyService.createCompany, {
    onSuccess: () => {
      message.success('Company created successfully');
      queryClient.invalidateQueries(['companies']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to create company');
    },
  });

  const updateCompanyMutation = useMutation(
    ({ id, data }) => companyService.updateCompany(id, data),
    {
      onSuccess: () => {
        message.success('Company updated successfully');
        queryClient.invalidateQueries(['companies']);
        setIsModalVisible(false);
        setEditingCompany(null);
        form.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update company');
      },
    }
  );

  const deleteCompanyMutation = useMutation(companyService.deleteCompany, {
    onSuccess: () => {
      message.success('Company deactivated successfully');
      queryClient.invalidateQueries(['companies']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete company');
    },
  });

  const handleCreateCompany = () => {
    setEditingCompany(null);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: company.name,
      contactPerson: company.contactPerson,
      email: company.email,
      phone: company.phone,
      address: company.address,
      isActive: company.isActive,
    });
  };

  const handleViewCompany = (company) => {
    setSelectedCompany(company);
    setIsDetailModalVisible(true);
  };

  const handleDeleteCompany = (companyId) => {
    deleteCompanyMutation.mutate(companyId);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingCompany) {
        updateCompanyMutation.mutate({ id: editingCompany.id, data: values });
      } else {
        createCompanyMutation.mutate(values);
      }
    });
  };

  const columns = [
    {
      title: 'Company Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <BankOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (contactPerson) => contactPerson || '-',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={isActive ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      title: 'Projects',
      dataIndex: 'projectCount',
      key: 'projectCount',
      render: (count) => (
        <Space>
          <ProjectOutlined />
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
              onClick={() => handleViewCompany(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Company">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditCompany(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to deactivate this company?"
            onConfirm={() => handleDeleteCompany(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Deactivate Company">
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

  if (currentUser?.role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Access Denied</Title>
        <Text type="secondary">You don't have permission to access this page.</Text>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner tip="Loading companies..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Companies</Title>
        <Text type="secondary">Failed to load companies. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const companies = companiesData?.data?.companies || [];
  const stats = companiesData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Company Management</Title>
            <Text type="secondary">Manage client companies and their information</Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateCompany}
              >
                Add Company
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Companies"
              value={stats.total || 0}
              prefix={<BankOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Active Companies"
              value={companies.filter(c => c.isActive).length}
              prefix={<BankOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Projects"
              value={companies.reduce((sum, c) => sum + (c.projectCount || 0), 0)}
              prefix={<ProjectOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Companies Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={companies}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} companies`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Create/Edit Company Modal */}
      <Modal
        title={editingCompany ? 'Edit Company' : 'Create New Company'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingCompany(null);
          form.resetFields();
        }}
        confirmLoading={createCompanyMutation.isLoading || updateCompanyMutation.isLoading}
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
            label="Company Name"
            rules={[
              { required: true, message: 'Please input company name!' },
              { min: 2, message: 'Company name must be at least 2 characters!' },
            ]}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>

          <Form.Item
            name="contactPerson"
            label="Contact Person"
          >
            <Input placeholder="Enter contact person name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[
              { pattern: /^[\+]?[0-9\s\-\(\)]+$/, message: 'Please enter a valid phone number!' },
            ]}
          >
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <TextArea
              placeholder="Enter company address"
              rows={3}
            />
          </Form.Item>

          {editingCompany && (
            <Form.Item
              name="isActive"
              label="Status"
            >
              <Select>
                <Option value={true}>Active</Option>
                <Option value={false}>Inactive</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Company Details Modal */}
      <Modal
        title="Company Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedCompany(null);
        }}
        footer={null}
        width={800}
      >
        {selectedCompany && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Company Name" span={2}>
              {selectedCompany.name}
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {selectedCompany.contactPerson || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={selectedCompany.isActive ? 'success' : 'error'}
                text={selectedCompany.isActive ? 'Active' : 'Inactive'}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedCompany.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {selectedCompany.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Projects">
              {selectedCompany.projectCount || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(selectedCompany.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            {selectedCompany.address && (
              <Descriptions.Item label="Address" span={2}>
                {selectedCompany.address}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Companies;