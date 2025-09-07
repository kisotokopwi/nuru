import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Table,
    Button,
    Card,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    Select,
    message,
    Popconfirm,
    Tooltip
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UserOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

const Supervisors = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingSupervisor, setEditingSupervisor] = useState(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch supervisors
    const { data: supervisors = [], isLoading } = useQuery(
        'supervisors',
        async () => {
            const response = await axios.get('/api/supervisors');
            return response.data;
        }
    );

    // Fetch sites for assignment
    const { data: sites = [] } = useQuery(
        'sites',
        async () => {
            const response = await axios.get('/api/sites');
            return response.data;
        }
    );

    // Create/Update supervisor mutation
    const createUpdateMutation = useMutation(
        async (supervisorData) => {
            if (editingSupervisor) {
                return axios.put(`/api/supervisors/${editingSupervisor.id}`, supervisorData);
            } else {
                return axios.post('/api/supervisors', supervisorData);
            }
        },
        {
            onSuccess: () => {
                message.success(editingSupervisor ? 'Supervisor updated successfully!' : 'Supervisor created successfully!');
                queryClient.invalidateQueries('supervisors');
                handleModalClose();
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    // Delete supervisor mutation
    const deleteMutation = useMutation(
        async (id) => {
            return axios.delete(`/api/supervisors/${id}`);
        },
        {
            onSuccess: () => {
                message.success('Supervisor deleted successfully!');
                queryClient.invalidateQueries('supervisors');
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    const handleModalOpen = (supervisor = null) => {
        setEditingSupervisor(supervisor);
        if (supervisor) {
            form.setFieldsValue({
                ...supervisor,
                site_id: supervisor.site_id
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingSupervisor(null);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        await createUpdateMutation.mutateAsync(values);
    };

    const handleDelete = async (id) => {
        await deleteMutation.mutateAsync(id);
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text, record) => (
                <Space>
                    <UserOutlined />
                    <span>{text}</span>
                </Space>
            )
        },
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email'
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone'
        },
        {
            title: 'Assigned Site',
            dataIndex: 'site_name',
            key: 'site_name',
            render: (text, record) => (
                <Space>
                    <EnvironmentOutlined />
                    <span>{text || 'Not assigned'}</span>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive) => (
                <Tag color={isActive ? 'green' : 'red'}>
                    {isActive ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => moment(date).format('MMM DD, YYYY')
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit">
                        <Button
                            type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleModalOpen(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this supervisor?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button
                                type="primary"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card
                title="Supervisors Management"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleModalOpen()}
                    >
                        Add Supervisor
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={supervisors}
                    loading={isLoading}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} supervisors`
                    }}
                />
            </Card>

            <Modal
                title={editingSupervisor ? 'Edit Supervisor' : 'Add New Supervisor'}
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="full_name"
                        label="Full Name"
                        rules={[{ required: true, message: 'Please enter full name' }]}
                    >
                        <Input placeholder="Enter full name" />
                    </Form.Item>

                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true, message: 'Please enter username' }]}
                    >
                        <Input placeholder="Enter username" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Please enter email' },
                            { type: 'email', message: 'Please enter a valid email' }
                        ]}
                    >
                        <Input placeholder="Enter email" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Phone"
                        rules={[{ required: true, message: 'Please enter phone number' }]}
                    >
                        <Input placeholder="Enter phone number" />
                    </Form.Item>

                    {!editingSupervisor && (
                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[{ required: true, message: 'Please enter password' }]}
                        >
                            <Input.Password placeholder="Enter password" />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="site_id"
                        label="Assign to Site"
                    >
                        <Select placeholder="Select a site" allowClear>
                            {sites.map(site => (
                                <Option key={site.id} value={site.id}>
                                    {site.name} - {site.project_name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="is_active"
                        label="Status"
                        initialValue={true}
                    >
                        <Select>
                            <Option value={true}>Active</Option>
                            <Option value={false}>Inactive</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createUpdateMutation.isLoading}
                            >
                                {editingSupervisor ? 'Update' : 'Create'}
                            </Button>
                            <Button onClick={handleModalClose}>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Supervisors;
