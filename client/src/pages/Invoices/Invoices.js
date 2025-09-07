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
    Select,
    message,
    Tooltip,
    DatePicker,
    Input,
    Tabs
} from 'antd';
import {
    FileTextOutlined,
    DownloadOutlined,
    EyeOutlined,
    SearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const Invoices = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    // Fetch daily records for invoice generation
    const { data: dailyRecords = [], isLoading } = useQuery(
        'dailyRecords',
        async () => {
            const response = await axios.get('/api/daily-records');
            return response.data;
        }
    );

    // Fetch existing invoices
    const { data: invoices = [], isLoading: invoicesLoading } = useQuery(
        'invoices',
        async () => {
            const response = await axios.get('/api/invoices');
            return response.data;
        }
    );

    // Generate invoice mutation
    const generateInvoiceMutation = useMutation(
        async (invoiceData) => {
            return axios.post('/api/invoices', invoiceData);
        },
        {
            onSuccess: (response) => {
                message.success('Invoice generated successfully!');
                queryClient.invalidateQueries('invoices');
                handleModalClose();

                // Download the generated PDF
                const pdfUrl = response.data.pdf_url;
                if (pdfUrl) {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `invoice-${response.data.invoice_number}.pdf`;
                    link.click();
                }
            },
            onError: (error) => {
                message.error(error.response?.data?.message || 'An error occurred');
            }
        }
    );

    const handleModalOpen = (record) => {
        setSelectedRecord(record);
        form.setFieldsValue({
            record_id: record.id,
            invoice_type: 'client'
        });
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setSelectedRecord(null);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        await generateInvoiceMutation.mutateAsync(values);
    };

    const handleDownload = async (invoice) => {
        try {
            const response = await axios.get(`/api/invoices/${invoice.id}/download`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-${invoice.invoice_number}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            message.error('Failed to download invoice');
        }
    };

    const dailyRecordsColumns = [
        {
            title: 'Date',
            dataIndex: 'record_date',
            key: 'record_date',
            render: (date) => moment(date).format('MMM DD, YYYY')
        },
        {
            title: 'Site',
            dataIndex: 'site_name',
            key: 'site_name'
        },
        {
            title: 'Project',
            dataIndex: 'project_name',
            key: 'project_name'
        },
        {
            title: 'Supervisor',
            dataIndex: 'supervisor_name',
            key: 'supervisor_name'
        },
        {
            title: 'Total Workers',
            key: 'total_workers',
            render: (_, record) => {
                const counts = record.worker_counts || {};
                return Object.values(counts).reduce((sum, count) => sum + count, 0);
            }
        },
        {
            title: 'Total Amount',
            key: 'total_amount',
            render: (_, record) => {
                const payments = record.payments_made || {};
                const total = Object.values(payments).reduce((sum, amount) => sum + amount, 0);
                return `TZS ${total.toLocaleString()}`;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Generate Invoice">
                        <Button
                            type="primary"
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={() => handleModalOpen(record)}
                        >
                            Generate Invoice
                        </Button>
                    </Tooltip>
                </Space>
            )
        }
    ];

    const invoicesColumns = [
        {
            title: 'Invoice Number',
            dataIndex: 'invoice_number',
            key: 'invoice_number'
        },
        {
            title: 'Type',
            dataIndex: 'invoice_type',
            key: 'invoice_type',
            render: (type) => (
                <Tag color={type === 'client' ? 'blue' : 'green'}>
                    {type === 'client' ? 'Client Invoice' : 'Nuru Invoice'}
                </Tag>
            )
        },
        {
            title: 'Date',
            dataIndex: 'record_date',
            key: 'record_date',
            render: (date) => moment(date).format('MMM DD, YYYY')
        },
        {
            title: 'Site',
            dataIndex: 'site_name',
            key: 'site_name'
        },
        {
            title: 'Generated By',
            dataIndex: 'generated_by_name',
            key: 'generated_by_name'
        },
        {
            title: 'Generated At',
            dataIndex: 'generated_at',
            key: 'generated_at',
            render: (date) => moment(date).format('MMM DD, YYYY HH:mm')
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Download">
                        <Button
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(record)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card title="Invoice Management">
                <Tabs defaultActiveKey="generate">
                    <Tabs.TabPane tab="Generate Invoice" key="generate">
                        <Table
                            columns={dailyRecordsColumns}
                            dataSource={dailyRecords}
                            loading={isLoading}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`
                            }}
                        />
                    </Tabs.TabPane>

                    <Tabs.TabPane tab="Generated Invoices" key="invoices">
                        <Table
                            columns={invoicesColumns}
                            dataSource={invoices}
                            loading={invoicesLoading}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} invoices`
                            }}
                        />
                    </Tabs.TabPane>
                </Tabs>
            </Card>

            <Modal
                title="Generate Invoice"
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={null}
                width={500}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="invoice_type"
                        label="Invoice Type"
                        rules={[{ required: true, message: 'Please select invoice type' }]}
                    >
                        <Select placeholder="Select invoice type">
                            <Option value="client">Client Invoice</Option>
                            <Option value="nuru">Nuru Invoice</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="detail_level"
                        label="Detail Level"
                        initialValue="summary"
                    >
                        <Select placeholder="Select detail level">
                            <Option value="summary">Summary</Option>
                            <Option value="detailed">Detailed</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="notes"
                        label="Additional Notes"
                    >
                        <Input.TextArea
                            rows={3}
                            placeholder="Enter any additional notes for the invoice"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={generateInvoiceMutation.isLoading}
                                icon={<FileTextOutlined />}
                            >
                                Generate Invoice
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

export default Invoices;
