import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
    Card,
    Row,
    Col,
    Button,
    DatePicker,
    Select,
    Form,
    Space,
    message,
    Table,
    Statistic
} from 'antd';
import {
    DownloadOutlined,
    FileTextOutlined,
    BarChartOutlined,
    PieChartOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Reports = () => {
    const [form] = Form.useForm();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch sites for filtering
    const { data: sites = [] } = useQuery(
        'sites',
        async () => {
            const response = await axios.get('/api/sites');
            return response.data;
        }
    );

    const handleGenerateReport = async (values) => {
        setLoading(true);
        try {
            const params = {
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD'),
                site_id: values.site_id,
                report_type: values.report_type
            };

            const response = await axios.get('/api/reports', { params });
            setReportData(response.data);
            message.success('Report generated successfully!');
        } catch (error) {
            message.error('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!reportData) return;

        try {
            const params = {
                start_date: form.getFieldValue('date_range')[0].format('YYYY-MM-DD'),
                end_date: form.getFieldValue('date_range')[1].format('YYYY-MM-DD'),
                site_id: form.getFieldValue('site_id'),
                report_type: form.getFieldValue('report_type'),
                format: 'pdf'
            };

            const response = await axios.get('/api/reports/download', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `report-${moment().format('YYYY-MM-DD')}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            message.error('Failed to download report');
        }
    };

    const summaryColumns = [
        {
            title: 'Site',
            dataIndex: 'site_name',
            key: 'site_name'
        },
        {
            title: 'Total Days',
            dataIndex: 'total_days',
            key: 'total_days'
        },
        {
            title: 'Total Workers',
            dataIndex: 'total_workers',
            key: 'total_workers'
        },
        {
            title: 'Total Amount',
            dataIndex: 'total_amount',
            key: 'total_amount',
            render: (amount) => `TZS ${amount.toLocaleString()}`
        },
        {
            title: 'Average Daily Amount',
            dataIndex: 'avg_daily_amount',
            key: 'avg_daily_amount',
            render: (amount) => `TZS ${amount.toLocaleString()}`
        }
    ];

    const workerTypeColumns = [
        {
            title: 'Worker Type',
            dataIndex: 'worker_type_name',
            key: 'worker_type_name'
        },
        {
            title: 'Total Days Worked',
            dataIndex: 'total_days',
            key: 'total_days'
        },
        {
            title: 'Total Workers',
            dataIndex: 'total_workers',
            key: 'total_workers'
        },
        {
            title: 'Total Amount',
            dataIndex: 'total_amount',
            key: 'total_amount',
            render: (amount) => `TZS ${amount.toLocaleString()}`
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card title="Reports & Analytics">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleGenerateReport}
                    initialValues={{
                        date_range: [moment().subtract(30, 'days'), moment()],
                        report_type: 'summary'
                    }}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="date_range"
                                label="Date Range"
                                rules={[{ required: true, message: 'Please select date range' }]}
                            >
                                <RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="site_id"
                                label="Site (Optional)"
                            >
                                <Select placeholder="All Sites" allowClear>
                                    {sites.map(site => (
                                        <Option key={site.id} value={site.id}>
                                            {site.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="report_type"
                                label="Report Type"
                                rules={[{ required: true, message: 'Please select report type' }]}
                            >
                                <Select>
                                    <Option value="summary">Summary Report</Option>
                                    <Option value="detailed">Detailed Report</Option>
                                    <Option value="worker_analysis">Worker Analysis</Option>
                                    <Option value="supervisor_performance">Supervisor Performance</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                icon={<BarChartOutlined />}
                            >
                                Generate Report
                            </Button>
                            {reportData && (
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleDownloadReport}
                                >
                                    Download PDF
                                </Button>
                            )}
                        </Space>
                    </Form.Item>
                </Form>

                {reportData && (
                    <div style={{ marginTop: '24px' }}>
                        <Row gutter={16} style={{ marginBottom: '24px' }}>
                            <Col span={6}>
                                <Card>
                                    <Statistic
                                        title="Total Days"
                                        value={reportData.summary?.total_days || 0}
                                        prefix={<FileTextOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic
                                        title="Total Workers"
                                        value={reportData.summary?.total_workers || 0}
                                        prefix={<BarChartOutlined />}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic
                                        title="Total Amount"
                                        value={reportData.summary?.total_amount || 0}
                                        prefix="TZS"
                                        formatter={(value) => value.toLocaleString()}
                                    />
                                </Card>
                            </Col>
                            <Col span={6}>
                                <Card>
                                    <Statistic
                                        title="Average Daily"
                                        value={reportData.summary?.avg_daily_amount || 0}
                                        prefix="TZS"
                                        formatter={(value) => value.toLocaleString()}
                                    />
                                </Card>
                            </Col>
                        </Row>

                        {reportData.site_summary && (
                            <Card title="Site Summary" style={{ marginBottom: '16px' }}>
                                <Table
                                    columns={summaryColumns}
                                    dataSource={reportData.site_summary}
                                    rowKey="site_id"
                                    pagination={false}
                                />
                            </Card>
                        )}

                        {reportData.worker_type_analysis && (
                            <Card title="Worker Type Analysis">
                                <Table
                                    columns={workerTypeColumns}
                                    dataSource={reportData.worker_type_analysis}
                                    rowKey="worker_type_id"
                                    pagination={false}
                                />
                            </Card>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Reports;
