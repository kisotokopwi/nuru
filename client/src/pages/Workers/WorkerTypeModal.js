import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Select,
  InputNumber
} from 'antd';
import { TeamOutlined, EnvironmentOutlined, DollarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const WorkerTypeModal = ({ visible, onCancel, onSubmit, workerType, sites, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (workerType) {
        form.setFieldsValue({
          site_id: workerType.site_id,
          name: workerType.name,
          daily_rate: workerType.daily_rate,
          description: workerType.description,
          minimum_task_requirement: workerType.minimum_task_requirement
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, workerType, form]);

  const handleSubmit = () => {
    form.validateFields().then(values => {
      onSubmit(values);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <div className="modal-title">
          <TeamOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {workerType ? 'Edit Worker Type' : 'Create New Worker Type'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      className="worker-type-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="worker-type-form"
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="site_id"
              label="Site"
              rules={[{ required: true, message: 'Please select a site' }]}
            >
              <Select
                placeholder="Select site"
                suffixIcon={<EnvironmentOutlined />}
                size="large"
                disabled={!!workerType} // Can't change site when editing
              >
                {sites?.map(site => (
                  <Option key={site.id} value={site.id}>
                    {site.name} - {site.client_company}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="Worker Type Name"
              rules={[
                { required: true, message: 'Please enter worker type name' },
                { min: 2, message: 'Worker type name must be at least 2 characters' }
              ]}
            >
              <Input
                placeholder="e.g., Skilled Worker, Cleaning Worker, Security Guard"
                prefix={<TeamOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="daily_rate"
              label="Daily Rate (TZS)"
              rules={[
                { required: true, message: 'Please enter daily rate' },
                { type: 'number', min: 0, message: 'Daily rate must be a positive number' }
              ]}
            >
              <InputNumber
                placeholder="Enter daily rate"
                prefix={<DollarOutlined />}
                style={{ width: '100%' }}
                size="large"
                min={0}
                step={1000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="description"
              label="Description"
              rules={[
                { max: 200, message: 'Description must not exceed 200 characters' }
              ]}
            >
              <TextArea
                placeholder="Enter worker type description (optional)"
                rows={3}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="minimum_task_requirement"
              label="Minimum Task Requirement"
              rules={[
                { max: 100, message: 'Task requirement must not exceed 100 characters' }
              ]}
            >
              <Input
                placeholder="e.g., Complete assigned mining tasks, Complete site cleaning duties"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

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
            >
              {workerType ? 'Update Worker Type' : 'Create Worker Type'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default WorkerTypeModal;