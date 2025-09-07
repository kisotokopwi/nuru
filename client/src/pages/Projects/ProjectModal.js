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
  Divider
} from 'antd';
import { ProjectOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ProjectModal = ({ visible, onCancel, onSubmit, project, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (project) {
        form.setFieldsValue({
          name: project.name,
          client_company: project.client_company,
          description: project.description,
          invoice_template: project.invoice_template || {
            header: 'Daily Work Report',
            footer: 'Thank you for your business',
            includeWorkerNames: false
          }
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          invoice_template: {
            header: 'Daily Work Report',
            footer: 'Thank you for your business',
            includeWorkerNames: false
          }
        });
      }
    }
  }, [visible, project, form]);

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
          <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {project ? 'Edit Project' : 'Create New Project'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      className="project-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="project-form"
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="name"
              label="Project Name"
              rules={[
                { required: true, message: 'Please enter project name' },
                { min: 3, message: 'Project name must be at least 3 characters' }
              ]}
            >
              <Input
                placeholder="Enter project name"
                prefix={<ProjectOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="client_company"
              label="Client Company"
              rules={[
                { required: true, message: 'Please enter client company name' },
                { min: 2, message: 'Client company name must be at least 2 characters' }
              ]}
            >
              <Input
                placeholder="Enter client company name"
                prefix={<EnvironmentOutlined />}
                size="large"
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
                { max: 500, message: 'Description must not exceed 500 characters' }
              ]}
            >
              <TextArea
                placeholder="Enter project description (optional)"
                rows={4}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">
          <Text strong>Invoice Template Settings</Text>
        </Divider>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name={['invoice_template', 'header']}
              label="Invoice Header"
              rules={[
                { required: true, message: 'Please enter invoice header' }
              ]}
            >
              <Input
                placeholder="e.g., GSM Company Ltd - Daily Work Report"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name={['invoice_template', 'footer']}
              label="Invoice Footer"
              rules={[
                { required: true, message: 'Please enter invoice footer' }
              ]}
            >
              <Input
                placeholder="e.g., Thank you for your business"
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name={['invoice_template', 'includeWorkerNames']}
              label="Include Worker Names in Client Invoice"
              valuePropName="checked"
            >
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="includeWorkerNames"
                  className="custom-checkbox"
                />
                <label htmlFor="includeWorkerNames" className="checkbox-label">
                  Include worker names in client invoices (usually kept for internal use only)
                </label>
              </div>
            </Form.Item>
          </Col>
        </Row>

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
            >
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default ProjectModal;