import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
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
  Descriptions,
  Alert,
  Divider,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  DownloadOutlined,
  PrinterOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { invoiceService } from '../../services/invoiceService';
import { siteService } from '../../services/siteService';
import { companyService } from '../../services/companyService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Invoices = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedSite, setSelectedSite] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading, error, refetch } = useQuery(
    ['invoices', selectedDate?.format('YYYY-MM-DD'), selectedSite],
    () => invoiceService.getInvoices({
      date: selectedDate?.format('YYYY-MM-DD'),
      siteId: selectedSite,
    }),
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

  const { data: companiesData } = useQuery(
    ['companies'],
    () => companyService.getCompanies(),
    {
      enabled: currentUser?.role === 'super_admin',
    }
  );

  const generateInvoiceMutation = useMutation(invoiceService.generateInvoice, {
    onSuccess: () => {
      message.success('Invoice generated successfully');
      queryClient.invalidateQueries(['invoices']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to generate invoice');
    },
  });

  const deleteInvoiceMutation = useMutation(invoiceService.deleteInvoice, {
    onSuccess: () => {
      message.success('Invoice deleted successfully');
      queryClient.invalidateQueries(['invoices']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete invoice');
    },
  });

  const sendInvoiceMutation = useMutation(invoiceService.sendInvoice, {
    onSuccess: () => {
      message.success('Invoice sent successfully');
      queryClient.invalidateQueries(['invoices']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to send invoice');
    },
  });

  const handleGenerateInvoice = () => {
    setIsModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
    });
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailModalVisible(true);
  };

  const handlePreviewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewModalVisible(true);
  };

  const handleDeleteInvoice = (invoiceId) => {
    deleteInvoiceMutation.mutate(invoiceId);
  };

  const handleSendInvoice = (invoiceId) => {
    sendInvoiceMutation.mutate(invoiceId);
  };

  const handleDownloadInvoice = (invoiceId, type = 'client') => {
    invoiceService.downloadInvoice(invoiceId, type)
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoiceId}-${type}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        message.success('Invoice downloaded successfully');
      })
      .catch((error) => {
        message.error('Failed to download invoice');
      });
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const formattedValues = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      generateInvoiceMutation.mutate(formattedValues);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
        return 'blue';
      case 'paid':
        return 'green';
      case 'overdue':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft':
        return <ClockCircleOutlined />;
      case 'sent':
        return <SendOutlined />;
      case 'paid':
        return <CheckCircleOutlined />;
      case 'overdue':
        return <ClockCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <span style={{ fontWeight: 'bold' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => new Date(date).toLocaleDateString(),
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
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (companyName) => (
        <Space>
          <DollarOutlined />
          <span>{companyName}</span>
        </Space>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status?.toUpperCase()}
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
              onClick={() => handleViewInvoice(record)}
            />
          </Tooltip>
          <Tooltip title="Preview Invoice">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              onClick={() => handlePreviewInvoice(record)}
            />
          </Tooltip>
          <Tooltip title="Download Client Invoice">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadInvoice(record.id, 'client')}
            />
          </Tooltip>
          <Tooltip title="Download Nuru Invoice">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadInvoice(record.id, 'nuru')}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="Send Invoice">
              <Button
                type="text"
                icon={<SendOutlined />}
                onClick={() => handleSendInvoice(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Are you sure you want to delete this invoice?"
            onConfirm={() => handleDeleteInvoice(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Invoice">
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
    return <LoadingSpinner tip="Loading invoices..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Invoices</Title>
        <Text type="secondary">Failed to load invoices. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const invoices = invoicesData?.data?.invoices || [];
  const stats = invoicesData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Invoice Management</Title>
            <Text type="secondary">Generate and manage dual invoices for clients and Nuru</Text>
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
                onClick={handleGenerateInvoice}
              >
                Generate Invoice
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Dual Invoice Notice */}
      <Alert
        message="Dual Invoice System"
        description="This system generates two identical invoices: one for the client (without payment details) and one for Nuru (with detailed payment information). Both invoices share the same unique identification number."
        type="info"
        style={{ marginBottom: 24 }}
        showIcon
      />

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Space>
              <Text strong>Date:</Text>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Select date"
              />
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Space>
              <Text strong>Site:</Text>
              <Select
                value={selectedSite}
                onChange={setSelectedSite}
                placeholder="All sites"
                style={{ width: 200 }}
                allowClear
              >
                {sitesData?.data?.sites?.map((site) => (
                  <Option key={site.id} value={site.id}>
                    {site.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={8}>
            <Button onClick={() => {
              setSelectedDate(dayjs());
              setSelectedSite(null);
            }}>
              Reset Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Invoices"
              value={stats.total || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Draft Invoices"
              value={invoices.filter(i => i.status === 'draft').length}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Sent Invoices"
              value={invoices.filter(i => i.status === 'sent').length}
              prefix={<SendOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Amount"
              value={invoices.reduce((sum, i) => sum + i.totalAmount, 0)}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Invoices Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} invoices`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Generate Invoice Modal */}
      <Modal
        title="Generate New Invoice"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={generateInvoiceMutation.isLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
          }}
        >
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
            name="date"
            label="Invoice Date"
            rules={[{ required: true, message: 'Please select date!' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Select date"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Additional Notes"
          >
            <TextArea
              placeholder="Enter any additional notes for the invoice"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        title="Invoice Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={null}
        width={800}
      >
        {selectedInvoice && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Invoice Number" span={2}>
                {selectedInvoice.invoiceNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {new Date(selectedInvoice.date).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedInvoice.status)} icon={getStatusIcon(selectedInvoice.status)}>
                  {selectedInvoice.status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {selectedInvoice.siteName}
              </Descriptions.Item>
              <Descriptions.Item label="Company">
                {selectedInvoice.companyName}
              </Descriptions.Item>
              <Descriptions.Item label="Total Amount">
                <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                  {formatCurrency(selectedInvoice.totalAmount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                {selectedInvoice.createdBy || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedInvoice.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {selectedInvoice.notes && (
              <>
                <Divider />
                <Title level={5}>Notes</Title>
                <Text>{selectedInvoice.notes}</Text>
              </>
            )}

            <Divider />
            <Title level={5}>Invoice Items</Title>
            <Table
              dataSource={selectedInvoice.items || []}
              columns={[
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                { title: 'Rate', dataIndex: 'rate', key: 'rate', render: (rate) => formatCurrency(rate) },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount) => formatCurrency(amount) },
              ]}
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        title="Invoice Preview"
        open={isPreviewModalVisible}
        onCancel={() => {
          setIsPreviewModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        {selectedInvoice && (
          <div style={{ padding: '20px', border: '1px solid #d9d9d9', backgroundColor: 'white' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Title level={2}>NURU COMPANY</Title>
              <Text type="secondary">Enhanced Worker Supervision & Invoice Management</Text>
            </div>
            
            <Row justify="space-between" style={{ marginBottom: '30px' }}>
              <Col>
                <Title level={4}>Invoice Details</Title>
                <Text>Invoice #: {selectedInvoice.invoiceNumber}</Text><br />
                <Text>Date: {new Date(selectedInvoice.date).toLocaleDateString()}</Text><br />
                <Text>Site: {selectedInvoice.siteName}</Text>
              </Col>
              <Col>
                <Title level={4}>Bill To</Title>
                <Text>{selectedInvoice.companyName}</Text>
              </Col>
            </Row>

            <Table
              dataSource={selectedInvoice.items || []}
              columns={[
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                { title: 'Rate', dataIndex: 'rate', key: 'rate', render: (rate) => formatCurrency(rate) },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount) => formatCurrency(amount) },
              ]}
              pagination={false}
              size="small"
            />

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <Title level={4}>Total: {formatCurrency(selectedInvoice.totalAmount)}</Title>
            </div>

            <Divider />

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <Text type="secondary">
                This is a preview of the client invoice. The Nuru invoice contains additional payment details.
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invoices;