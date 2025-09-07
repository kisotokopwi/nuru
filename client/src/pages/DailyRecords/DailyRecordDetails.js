import React from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Statistic,
  Divider,
  Timeline,
  Alert
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  EditOutlined,
  LockOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

const DailyRecordDetails = ({ visible, onCancel, record }) => {
  if (!record) return null;

  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0
  }).format(amount);

  const getStatusColor = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (record.is_locked) return 'red';
    if (recordDate === today) return 'green';
    if (moment(recordDate).isAfter(today)) return 'orange';
    return 'default';
  };

  const getStatusText = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (record.is_locked) return 'Locked';
    if (recordDate === today) return 'Today';
    if (moment(recordDate).isAfter(today)) return 'Future';
    return 'Past';
  };

  const canEdit = (record) => {
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    return recordDate === today && !record.is_locked;
  };

  // Worker details columns
  const workerColumns = [
    {
      title: 'Worker Type',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Rate: {formatCurrency(record.daily_rate)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      align: 'center',
      render: (count) => (
        <Tag color="blue" icon={<UserOutlined />}>
          {count}
        </Tag>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'payment',
      key: 'payment',
      align: 'right',
      render: (payment) => (
        <Text strong style={{ color: '#27ae60' }}>
          {formatCurrency(payment)}
        </Text>
      ),
    },
    {
      title: 'Worker Names',
      dataIndex: 'names',
      key: 'names',
      render: (names) => (
        names ? (
          <Text style={{ fontSize: '12px' }}>
            {Array.isArray(names) ? names.join(', ') : names}
          </Text>
        ) : (
          <Text type="secondary">Not provided</Text>
        )
      ),
    },
  ];

  // Prepare worker data for table
  const workerData = record.worker_types?.map(wt => ({
    key: wt.id,
    name: wt.name,
    daily_rate: wt.daily_rate,
    count: record.worker_counts?.[wt.id] || 0,
    payment: record.payments_made?.[wt.id] || 0,
    names: record.worker_names?.[wt.id]
  })) || [];

  // Corrections timeline
  const correctionsTimeline = record.corrections?.map((correction, index) => ({
    color: 'red',
    children: (
      <div>
        <Text strong>{correction.correction_reason}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {moment(correction.corrected_at).format('DD/MM/YYYY HH:mm')} by {correction.corrected_by_name}
        </Text>
      </div>
    )
  })) || [];

  return (
    <Modal
      title={
        <div className="modal-title">
          <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Daily Record Details
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      className="daily-record-details-modal"
    >
      <div className="record-details">
        {/* Record Information */}
        <Card className="info-card" title="Record Information">
          <Descriptions column={2} size="middle">
            <Descriptions.Item label="Date" span={2}>
              <Text strong style={{ fontSize: '16px' }}>
                {moment(record.record_date).format('DD/MM/YYYY dddd')}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Site">
              <Text>{record.site_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Client">
              <Text>{record.client_company}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              <Text>{record.supervisor_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(record)}>
                {getStatusText(record)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              <Text>{moment(record.created_at).format('DD/MM/YYYY HH:mm')}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              <Text>{moment(record.updated_at).format('DD/MM/YYYY HH:mm')}</Text>
            </Descriptions.Item>
            {record.notes && (
              <Descriptions.Item label="Notes" span={2}>
                <Text>{record.notes}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Summary Statistics */}
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Total Workers"
                value={record.worker_counts?.total || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Total Payments"
                value={record.payments_made?.total || 0}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => formatCurrency(value)}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Corrections"
                value={record.corrections_count || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Production Information */}
        {record.production_data && (
          <Card className="production-card" title="Production Information">
            <Row gutter={[16, 16]}>
              {record.production_data.tons_produced && (
                <Col span={12}>
                  <div className="production-item">
                    <Text strong>Tons Produced: </Text>
                    <Text>{record.production_data.tons_produced}</Text>
                  </div>
                </Col>
              )}
              {record.production_data.task_completion && (
                <Col span={12}>
                  <div className="production-item">
                    <Text strong>Task Status: </Text>
                    <Tag color="green">{record.production_data.task_completion}</Tag>
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {/* Worker Details */}
        <Card 
          className="workers-card" 
          title={
            <div className="card-title">
              <UserOutlined style={{ marginRight: 8 }} />
              Worker Details
            </div>
          }
        >
          <Table
            columns={workerColumns}
            dataSource={workerData}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
          />
        </Card>

        {/* Corrections History */}
        {record.corrections && record.corrections.length > 0 && (
          <Card className="corrections-card" title="Correction History">
            <Alert
              message="This record has been corrected"
              description={`${record.corrections.length} correction(s) made to this record.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Timeline items={correctionsTimeline} />
          </Card>
        )}

        <Divider />

        <div className="modal-footer">
          <Space>
            <Button onClick={onCancel}>
              Close
            </Button>
            {canEdit(record) && (
              <Button type="primary" icon={<EditOutlined />}>
                Edit Record
              </Button>
            )}
            {record.is_locked && (
              <Button type="default" icon={<LockOutlined />} disabled>
                Record Locked
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default DailyRecordDetails;