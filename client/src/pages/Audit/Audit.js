import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
    Table,
    Card,
    Space,
    Tag,
    DatePicker,
    Select,
    Form,
    Input,
    Button,
    Row,
    Col
} from 'antd';
import {
    SearchOutlined,
    ReloadOutlined,
    UserOutlined,
    TableOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Audit = () => {
    const [form] = Form.useForm();
    const [filters, setFilters] = useState({});

    // Fetch audit trail
    const { data: auditTrail = [], isLoading, refetch } = useQuery(
        ['auditTrail', filters],
        async () => {
            const params = {
                ...filters,
                start_date: filters.start_date?.format('YYYY-MM-DD'),
                end_date: filters.end_date?.format('YYYY-MM-DD')
            };

            const response = await axios.get('/api/audit', { params });
            return response.data;
        }
    );

    const handleSearch = (values) => {
        setFilters(values);
    };

    const handleReset = () => {
        form.resetFields();
        setFilters({});
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'INSERT':
                return 'green';
            case 'UPDATE':
                return 'blue';
            case 'DELETE':
                return 'red';
            default:
                return 'default';
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'INSERT':
                return <PlusOutlined />;
            case 'UPDATE':
                return <EditOutlined />;
            case 'DELETE':
                return <DeleteOutlined />;
            default:
                return <TableOutlined />;
        }
    };

    const columns = [
        {
            title: 'Timestamp',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date) => moment(date).format('MMM DD, YYYY HH:mm:ss'),
            sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
            defaultSortOrder: 'descend'
        },
        {
            title: 'User',
            dataIndex: 'user_name',
            key: 'user_name',
            render: (text, record) => (
                <Space>
                    <UserOutlined />
                    <span>{text || 'System'}</span>
                </Space>
            )
        },
        {
            title: 'Table',
            dataIndex: 'table_name',
            key: 'table_name',
            render: (text) => (
                <Space>
                    <TableOutlined />
                    <span>{text}</span>
                </Space>
            )
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action) => (
                <Tag color={getActionColor(action)} icon={getActionIcon(action)}>
                    {action}
                </Tag>
            )
        },
        {
            title: 'Record ID',
            dataIndex: 'record_id',
            key: 'record_id'
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            render: (reason) => reason || '-'
        },
        {
            title: 'IP Address',
            dataIndex: 'ip_address',
            key: 'ip_address',
            render: (ip) => ip || '-'
        }
    ];

    const expandedRowRender = (record) => {
        const oldValues = record.old_values ? JSON.parse(record.old_values) : null;
        const newValues = record.new_values ? JSON.parse(record.new_values) : null;

        return (
            <div style={{ padding: '16px', backgroundColor: '#f5f5f5' }}>
                <Row gutter={16}>
                    {oldValues && (
                        <Col span={12}>
                            <Card size="small" title="Old Values" style={{ marginBottom: '8px' }}>
                                <pre style={{ fontSize: '12px', margin: 0 }}>
                                    {JSON.stringify(oldValues, null, 2)}
                                </pre>
                            </Card>
                        </Col>
                    )}
                    {newValues && (
                        <Col span={12}>
                            <Card size="small" title="New Values" style={{ marginBottom: '8px' }}>
                                <pre style={{ fontSize: '12px', margin: 0 }}>
                                    {JSON.stringify(newValues, null, 2)}
                                </pre>
                            </Card>
                        </Col>
                    )}
                </Row>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px' }}>
            <Card title="Audit Trail">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSearch}
                    style={{ marginBottom: '16px' }}
                >
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item
                                name="date_range"
                                label="Date Range"
                            >
                                <RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item
                                name="table_name"
                                label="Table"
                            >
                                <Select placeholder="All Tables" allowClear>
                                    <Option value="users">Users</Option>
                                    <Option value="projects">Projects</Option>
                                    <Option value="sites">Sites</Option>
                                    <Option value="worker_types">Worker Types</Option>
                                    <Option value="daily_records">Daily Records</Option>
                                    <Option value="invoices">Invoices</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item
                                name="action"
                                label="Action"
                            >
                                <Select placeholder="All Actions" allowClear>
                                    <Option value="INSERT">INSERT</Option>
                                    <Option value="UPDATE">UPDATE</Option>
                                    <Option value="DELETE">DELETE</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={4}>
                            <Form.Item
                                name="user_id"
                                label="User"
                            >
                                <Input placeholder="User ID" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item label=" ">
                                <Space>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SearchOutlined />}
                                    >
                                        Search
                                    </Button>
                                    <Button
                                        onClick={handleReset}
                                        icon={<ReloadOutlined />}
                                    >
                                        Reset
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                <Table
                    columns={columns}
                    dataSource={auditTrail}
                    loading={isLoading}
                    rowKey="id"
                    expandable={{
                        expandedRowRender,
                        rowExpandable: (record) => record.old_values || record.new_values
                    }}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} audit records`
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>
        </div>
    );
};

export default Audit;
