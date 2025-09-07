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
  Select
} from 'antd';
import { EnvironmentOutlined, ProjectOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const SiteModal = ({ visible, onCancel, onSubmit, site, projects, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (site) {
        form.setFieldsValue({
          project_id: site.project_id,
          name: site.name,
          location: site.location,
          client_company: site.client_company,
          description: site.description
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, site, form]);

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
          <EnvironmentOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {site ? 'Edit Site' : 'Create New Site'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      className="site-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="site-form"
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="project_id"
              label="Project"
              rules={[{ required: true, message: 'Please select a project' }]}
            >
              <Select
                placeholder="Select project"
                suffixIcon={<ProjectOutlined />}
                size="large"
                disabled={!!site} // Can't change project when editing
              >
                {projects?.map(project => (
                  <Option key={project.id} value={project.id}>
                    {project.name} - {project.client_company}
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
              label="Site Name"
              rules={[
                { required: true, message: 'Please enter site name' },
                { min: 3, message: 'Site name must be at least 3 characters' }
              ]}
            >
              <Input
                placeholder="Enter site name"
                prefix={<EnvironmentOutlined />}
                size="large"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="location"
              label="Location"
              rules={[
                { required: true, message: 'Please enter location' },
                { min: 3, message: 'Location must be at least 3 characters' }
              ]}
            >
              <Input
                placeholder="Enter site location"
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
                placeholder="Enter site description (optional)"
                rows={4}
                showCount
                maxLength={500}
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
              {site ? 'Update Site' : 'Create Site'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default SiteModal;