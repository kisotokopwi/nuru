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
    LockOutlined,
    UnlockOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

const Users = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch users
    const { data: users = [], isLoading } = useQuery(
        'users',
        async () => {
            const response = await axios.get('/api/users');
            return response.data;
        }
    );

    // Create/Update user mutation
    const createUpdateMutation = useMutation(
        async (userData) => {
            if (editingUser) {
                return axios.put(`/api/users/${editingUser.id}`, userData);
            } else {
                return axios.post('/api/users', userData);
            }
        },
        {
            onSuccess: () => {
                message.success(editingUser ? 'User updated successfully!' : 'User created successfully!');
                queryClient.invalidateQueries('users');
                handleModalClose();
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    // Delete user mutation
    const deleteMutation = useMutation(
        async (id) => {
            return axios.delete(`/api/users/${id}`);
        },
        {
            onSuccess: () => {
                message.success('User deleted successfully!');
                queryClient.invalidateQueries('users');
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    // Toggle user status mutation
    const toggleStatusMutation = useMutation(
        async ({ id, isActive }) => {
            return axios.patch(`/api/users/${id}/status`, { is_active: isActive });
        },
        {
            onSuccess: () => {
                message.success('User status updated successfully!');
                queryClient.invalidateQueries('users');
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    const handleModalOpen = (user = null) => {
        setEditingUser(user);
        if (user) {
            form.setFieldsValue({
                ...user,
                password: undefined // Don't pre-fill password
            });
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setEditingUser(null);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        await createUpdateMutation.mutateAsync(values);
    };

    const handleDelete = async (id) => {
        await deleteMutation.mutateAsync(id);
    };

    const handleToggleStatus = async (user) => {
        await toggleStatusMutation.mutateAsync({
            id: user.id,
            isActive: !user.is_active
        });
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'super_admin':
                return 'red';
            case 'site_admin':
                return 'blue';
            case 'supervisor':
                return 'green';
            default:
                return 'default';
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'super_admin':
                return 'Super Admin';
            case 'site_admin':
                return 'Site Admin';
            case 'supervisor':
                return 'Supervisor';
            default:
                return role;
        }
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
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={getRoleColor(role)}>
                    {getRoleDisplayName(role)}
                </Tag>
            )
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone'
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
                    <Tooltip title={record.is_active ? 'Deactivate' : 'Activate'}>
                        <Button
                            type={record.is_active ? 'default' : 'primary'}
                            size="small"
                            icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={() => handleToggleStatus(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Are you sure you want to delete this user?"
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
                title="User Management"
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleModalOpen()}
                    >
                        Add User
                    </Button>
                }
            >
                <Table
                    columns={columns}
                    dataSource={users}
                    loading={isLoading}
                    rowKey="id"
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`
                    }}
                />
            </Card>

            <Modal
                title={editingUser ? 'Edit User' : 'Add New User'}
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

                    <Form.Item
                        name="role"
                        label="Role"
                        rules={[{ required: true, message: 'Please select role' }]}
                    >
                        <Select placeholder="Select role">
                            <Option value="super_admin">Super Admin</Option>
                            <Option value="site_admin">Site Admin</Option>
                            <Option value="supervisor">Supervisor</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[
                            { required: !editingUser, message: 'Please enter password' },
                            { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                    >
                        <Input.Password placeholder="Enter password" />
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
                                {editingUser ? 'Update' : 'Create'}
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

export default Users;
