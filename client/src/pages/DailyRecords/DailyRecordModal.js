import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Select,
  DatePicker,
  InputNumber,
  Card,
  Alert,
  Collapse,
  Switch
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const DailyRecordModal = ({ visible, onCancel, onSubmit, record, sites, loading }) => {
  const [form] = Form.useForm();
  const [selectedSite, setSelectedSite] = useState(null);
  const [workerTypes, setWorkerTypes] = useState([]);
  const [workerCounts, setWorkerCounts] = useState({});
  const [payments, setPayments] = useState({});
  const [workerNames, setWorkerNames] = useState({});
  const [includeWorkerNames, setIncludeWorkerNames] = useState(false);

  // Fetch worker types when site changes
  useEffect(() => {
    if (selectedSite) {
      fetchWorkerTypes(selectedSite);
    } else {
      setWorkerTypes([]);
      setWorkerCounts({});
      setPayments({});
      setWorkerNames({});
    }
  }, [selectedSite]);

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      if (record) {
        // Editing existing record
        form.setFieldsValue({
          site_id: record.site_id,
          record_date: moment(record.record_date),
          notes: record.notes
        });
        
        setSelectedSite(record.site_id);
        setWorkerCounts(record.worker_counts || {});
        setPayments(record.payments_made || {});
        setWorkerNames(record.worker_names || {});
        setIncludeWorkerNames(!!record.worker_names);
      } else {
        // Creating new record
        form.resetFields();
        form.setFieldsValue({
          record_date: moment()
        });
        setSelectedSite(null);
        setWorkerCounts({});
        setPayments({});
        setWorkerNames({});
        setIncludeWorkerNames(false);
      }
    }
  }, [visible, record, form]);

  const fetchWorkerTypes = async (siteId) => {
    try {
      const response = await fetch(`/api/worker-types/site/${siteId}`);
      const data = await response.json();
      setWorkerTypes(data.worker_types || []);
    } catch (error) {
      console.error('Failed to fetch worker types:', error);
    }
  };

  const handleSiteChange = (siteId) => {
    setSelectedSite(siteId);
    setWorkerCounts({});
    setPayments({});
    setWorkerNames({});
  };

  const handleWorkerCountChange = (workerTypeId, count) => {
    setWorkerCounts(prev => ({
      ...prev,
      [workerTypeId]: count || 0
    }));
    
    // Auto-calculate payment based on daily rate
    const workerType = workerTypes.find(wt => wt.id.toString() === workerTypeId.toString());
    if (workerType && count) {
      const payment = count * workerType.daily_rate;
      setPayments(prev => ({
        ...prev,
        [workerTypeId]: payment
      }));
    } else {
      setPayments(prev => {
        const newPayments = { ...prev };
        delete newPayments[workerTypeId];
        return newPayments;
      });
    }
  };

  const handlePaymentChange = (workerTypeId, payment) => {
    setPayments(prev => ({
      ...prev,
      [workerTypeId]: payment || 0
    }));
  };

  const handleWorkerNameChange = (workerTypeId, names) => {
    setWorkerNames(prev => ({
      ...prev,
      [workerTypeId]: names
    }));
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const formData = {
        ...values,
        record_date: values.record_date.format('YYYY-MM-DD'),
        worker_counts: workerCounts,
        payments_made: payments,
        worker_names: includeWorkerNames ? workerNames : {},
        production_data: {
          tons_produced: values.tons_produced || 0,
          task_completion: values.task_completion || 'Completed'
        }
      };

      if (record) {
        // Add correction reason for updates
        formData.correction_reason = 'Data correction';
      }

      onSubmit(formData);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedSite(null);
    setWorkerTypes([]);
    setWorkerCounts({});
    setPayments({});
    setWorkerNames({});
    setIncludeWorkerNames(false);
    onCancel();
  };

  const calculateTotals = () => {
    const totalWorkers = Object.values(workerCounts).reduce((sum, count) => sum + (count || 0), 0);
    const totalPayments = Object.values(payments).reduce((sum, payment) => sum + (payment || 0), 0);
    return { totalWorkers, totalPayments };
  };

  const { totalWorkers, totalPayments } = calculateTotals();

  return (
    <Modal
      title={
        <div className="modal-title">
          <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {record ? 'Edit Daily Record' : 'Create Daily Record'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnClose
      className="daily-record-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="daily-record-form"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="site_id"
              label="Site"
              rules={[{ required: true, message: 'Please select a site' }]}
            >
              <Select
                placeholder="Select site"
                onChange={handleSiteChange}
                suffixIcon={<EnvironmentOutlined />}
                size="large"
                disabled={!!record} // Can't change site when editing
              >
                {sites?.map(site => (
                  <Option key={site.id} value={site.id}>
                    {site.name} - {site.client_company}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="record_date"
              label="Record Date"
              rules={[{ required: true, message: 'Please select record date' }]}
            >
              <DatePicker
                placeholder="Select date"
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                size="large"
                suffixIcon={<CalendarOutlined />}
                disabledDate={(current) => {
                  // Can't select future dates
                  return current && current > moment().endOf('day');
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {selectedSite && workerTypes.length > 0 && (
          <>
            <Divider orientation="left">
              <Text strong>Worker Information</Text>
            </Divider>

            <Card className="worker-types-card">
              <Row gutter={[16, 16]}>
                {workerTypes.map(workerType => (
                  <Col span={24} key={workerType.id}>
                    <Card size="small" className="worker-type-card">
                      <Row gutter={16} align="middle">
                        <Col span={6}>
                          <div className="worker-type-info">
                            <Text strong>{workerType.name}</Text>
                            <br />
                            <Text type="secondary">
                              Rate: {new Intl.NumberFormat('en-TZ', {
                                style: 'currency',
                                currency: 'TZS',
                                minimumFractionDigits: 0
                              }).format(workerType.daily_rate)}
                            </Text>
                          </div>
                        </Col>
                        <Col span={4}>
                          <Form.Item
                            label="Count"
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber
                              min={0}
                              max={100}
                              value={workerCounts[workerType.id] || 0}
                              onChange={(value) => handleWorkerCountChange(workerType.id, value)}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            label="Payment"
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber
                              min={0}
                              value={payments[workerType.id] || 0}
                              onChange={(value) => handlePaymentChange(workerType.id, value)}
                              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={value => value.replace(/\$\s?|(,*)/g, '')}
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          {includeWorkerNames && (
                            <Form.Item
                              label="Worker Names"
                              style={{ marginBottom: 0 }}
                            >
                              <Input
                                placeholder="Enter names (comma separated)"
                                value={workerNames[workerType.id] || ''}
                                onChange={(e) => handleWorkerNameChange(workerType.id, e.target.value)}
                              />
                            </Form.Item>
                          )}
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Divider />

              <Row gutter={16}>
                <Col span={12}>
                  <div className="total-summary">
                    <Text strong>Total Workers: {totalWorkers}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="total-summary">
                    <Text strong>
                      Total Payments: {new Intl.NumberFormat('en-TZ', {
                        style: 'currency',
                        currency: 'TZS',
                        minimumFractionDigits: 0
                      }).format(totalPayments)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>

            <Divider orientation="left">
              <Text strong>Production Information</Text>
            </Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="tons_produced"
                  label="Tons Produced"
                  rules={[
                    { type: 'number', min: 0, message: 'Tons must be a positive number' }
                  ]}
                >
                  <InputNumber
                    min={0}
                    step={0.1}
                    placeholder="Enter tons produced"
                    style={{ width: '100%' }}
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="task_completion"
                  label="Task Completion Status"
                >
                  <Select
                    placeholder="Select status"
                    size="large"
                    defaultValue="Completed"
                  >
                    <Option value="Completed">Completed</Option>
                    <Option value="Partially Completed">Partially Completed</Option>
                    <Option value="In Progress">In Progress</Option>
                    <Option value="Delayed">Delayed</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">
              <Text strong>Additional Options</Text>
            </Divider>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item>
                  <div className="switch-wrapper">
                    <Switch
                      checked={includeWorkerNames}
                      onChange={setIncludeWorkerNames}
                    />
                    <Text style={{ marginLeft: 8 }}>
                      Include worker names in record
                    </Text>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea
                placeholder="Enter any additional notes (optional)"
                rows={3}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </>
        )}

        {record && (
          <Alert
            message="Editing Record"
            description="You are editing an existing record. All changes will be logged for audit purposes."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Divider />

        <div className="modal-footer">
          <Space>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              disabled={!selectedSite || workerTypes.length === 0}
            >
              {record ? 'Update Record' : 'Create Record'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default DailyRecordModal;