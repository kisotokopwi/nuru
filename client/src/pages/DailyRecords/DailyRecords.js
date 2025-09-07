import React, { useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
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
  Badge,
  Timeline,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { dailyRecordService } from '../../services/dailyRecordService';
import { siteService } from '../../services/siteService';
import { workerTypeService } from '../../services/workerTypeService';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { formatCurrency } from '../../utils/currency';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const DailyRecords = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedSite, setSelectedSite] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: dailyRecordsData, isLoading, error, refetch } = useQuery(
    ['dailyRecords', selectedDate?.format('YYYY-MM-DD'), selectedSite],
    () => dailyRecordService.getDailyRecords({
      date: selectedDate?.format('YYYY-MM-DD'),
      siteId: selectedSite,
    }),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin' || currentUser?.role === 'supervisor',
    }
  );

  const { data: sitesData } = useQuery(
    ['sites'],
    () => siteService.getSites(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin',
    }
  );

  const { data: workerTypesData } = useQuery(
    ['workerTypes'],
    () => workerTypeService.getWorkerTypes(),
    {
      enabled: currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin' || currentUser?.role === 'supervisor',
    }
  );

  const createDailyRecordMutation = useMutation(dailyRecordService.createDailyRecord, {
    onSuccess: () => {
      message.success('Daily record created successfully');
      queryClient.invalidateQueries(['dailyRecords']);
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to create daily record');
    },
  });

  const updateDailyRecordMutation = useMutation(
    ({ id, data }) => dailyRecordService.updateDailyRecord(id, data),
    {
      onSuccess: () => {
        message.success('Daily record updated successfully');
        queryClient.invalidateQueries(['dailyRecords']);
        setIsEditModalVisible(false);
        setEditingRecord(null);
        editForm.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update daily record');
      },
    }
  );

  const deleteDailyRecordMutation = useMutation(dailyRecordService.deleteDailyRecord, {
    onSuccess: () => {
      message.success('Daily record deleted successfully');
      queryClient.invalidateQueries(['dailyRecords']);
    },
    onError: (error) => {
      message.error(error.response?.data?.message || 'Failed to delete daily record');
    },
  });

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
    });
  };

  const handleEditRecord = (record) => {
    // Check if record can be edited (same day only)
    const recordDate = dayjs(record.date);
    const today = dayjs();
    
    if (!recordDate.isSame(today, 'day')) {
      message.error('Records can only be edited on the same day they were created');
      return;
    }

    setEditingRecord(record);
    setIsEditModalVisible(true);
    editForm.setFieldsValue({
      siteId: record.siteId,
      date: dayjs(record.date),
      workerCounts: record.workerCounts,
      production: record.production,
      payments: record.payments,
      notes: record.notes,
    });
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setIsDetailModalVisible(true);
  };

  const handleDeleteRecord = (recordId) => {
    deleteDailyRecordMutation.mutate(recordId);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const formattedValues = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      };
      createDailyRecordMutation.mutate(formattedValues);
    });
  };

  const handleEditModalOk = () => {
    editForm.validateFields().then((values) => {
      const formattedValues = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        reason: 'Correction', // Default reason for same-day corrections
      };
      updateDailyRecordMutation.mutate({ id: editingRecord.id, data: formattedValues });
    });
  };

  const getStatusColor = (record) => {
    const recordDate = dayjs(record.date);
    const today = dayjs();
    
    if (recordDate.isSame(today, 'day')) {
      return 'green';
    } else if (recordDate.isBefore(today, 'day')) {
      return 'blue';
    } else {
      return 'orange';
    }
  };

  const getStatusText = (record) => {
    const recordDate = dayjs(record.date);
    const today = dayjs();
    
    if (recordDate.isSame(today, 'day')) {
      return 'Today';
    } else if (recordDate.isBefore(today, 'day')) {
      return 'Past';
    } else {
      return 'Future';
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => (
        <Space>
          <CalendarOutlined />
          <span>{new Date(date).toLocaleDateString()}</span>
        </Space>
      ),
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
      title: 'Workers',
      dataIndex: 'workerCounts',
      key: 'workerCounts',
      render: (workerCounts) => {
        const total = Object.values(workerCounts || {}).reduce((sum, count) => sum + count, 0);
        return (
          <Space>
            <TeamOutlined />
            <span>{total}</span>
          </Space>
        );
      },
    },
    {
      title: 'Production',
      dataIndex: 'production',
      key: 'production',
      render: (production) => production ? `${production} tons` : '-',
    },
    {
      title: 'Total Payments',
      dataIndex: 'payments',
      key: 'payments',
      render: (payments) => {
        const total = Object.values(payments || {}).reduce((sum, amount) => sum + amount, 0);
        return (
          <Space>
            <DollarOutlined />
            <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrency(total)}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record)}>
          {getStatusText(record)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const recordDate = dayjs(record.date);
        const today = dayjs();
        const canEdit = recordDate.isSame(today, 'day');
        
        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewRecord(record)}
              />
            </Tooltip>
            {canEdit && (
              <Tooltip title="Edit Record">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditRecord(record)}
                />
              </Tooltip>
            )}
            {canEdit && (
              <Popconfirm
                title="Are you sure you want to delete this record?"
                onConfirm={() => handleDeleteRecord(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Tooltip title="Delete Record">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingSpinner tip="Loading daily records..." />;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Title level={3}>Error Loading Daily Records</Title>
        <Text type="secondary">Failed to load daily records. Please try again.</Text>
        <br />
        <Button type="primary" onClick={() => refetch()} style={{ marginTop: 16 }}>
          <ReloadOutlined /> Retry
        </Button>
      </div>
    );
  }

  const dailyRecords = dailyRecordsData?.data?.records || [];
  const stats = dailyRecordsData?.data?.pagination || {};

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Daily Records Management</Title>
            <Text type="secondary">Manage daily work records with fraud prevention</Text>
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
                onClick={handleCreateRecord}
              >
                Add Daily Record
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Fraud Prevention Alert */}
      <Alert
        message="Fraud Prevention Notice"
        description="Records can only be edited on the same day they were created. All changes are logged with timestamps and reasons for audit purposes."
        type="warning"
        icon={<WarningOutlined />}
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
              title="Total Records"
              value={stats.total || 0}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Today's Records"
              value={dailyRecords.filter(r => dayjs(r.date).isSame(dayjs(), 'day')).length}
              prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Workers"
              value={dailyRecords.reduce((sum, r) => 
                sum + Object.values(r.workerCounts || {}).reduce((s, c) => s + c, 0), 0
              )}
              prefix={<TeamOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Payments"
              value={dailyRecords.reduce((sum, r) => 
                sum + Object.values(r.payments || {}).reduce((s, p) => s + p, 0), 0
              )}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Daily Records Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={dailyRecords}
          rowKey="id"
          pagination={{
            current: stats.page,
            pageSize: stats.limit,
            total: stats.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} records`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create Daily Record Modal */}
      <Modal
        title="Create Daily Record"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createDailyRecordMutation.isLoading}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select date!' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select date"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="production"
            label="Production (tons)"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter production amount"
              min={0}
              step={0.1}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea
              placeholder="Enter any additional notes"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Daily Record Modal */}
      <Modal
        title="Edit Daily Record"
        open={isEditModalVisible}
        onOk={handleEditModalOk}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingRecord(null);
          editForm.resetFields();
        }}
        confirmLoading={updateDailyRecordMutation.isLoading}
        width={800}
      >
        <Alert
          message="Same-Day Correction"
          description="This record can only be edited because it was created today. All changes will be logged for audit purposes."
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={editForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="siteId"
                label="Site"
                rules={[{ required: true, message: 'Please select a site!' }]}
              >
                <Select placeholder="Select site" disabled>
                  {sitesData?.data?.sites?.map((site) => (
                    <Option key={site.id} value={site.id}>
                      {site.name} - {site.location}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select date!' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select date"
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="production"
            label="Production (tons)"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter production amount"
              min={0}
              step={0.1}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea
              placeholder="Enter any additional notes"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Daily Record Details Modal */}
      <Modal
        title="Daily Record Details"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false);
          setSelectedRecord(null);
        }}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Date" span={2}>
                {new Date(selectedRecord.date).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {selectedRecord.siteName}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedRecord)}>
                  {getStatusText(selectedRecord)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Production">
                {selectedRecord.production ? `${selectedRecord.production} tons` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                {selectedRecord.createdBy || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(selectedRecord.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {new Date(selectedRecord.updatedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.notes && (
              <>
                <Divider />
                <Title level={5}>Notes</Title>
                <Text>{selectedRecord.notes}</Text>
              </>
            )}

            <Divider />
            <Title level={5}>Worker Counts</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(selectedRecord.workerCounts || {}).map(([type, count]) => (
                <Col span={8} key={type}>
                  <Card size="small">
                    <Statistic
                      title={type}
                      value={count}
                      prefix={<TeamOutlined />}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />
            <Title level={5}>Payments</Title>
            <Row gutter={[16, 16]}>
              {Object.entries(selectedRecord.payments || {}).map(([type, amount]) => (
                <Col span={8} key={type}>
                  <Card size="small">
                    <Statistic
                      title={type}
                      value={amount}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DailyRecords;