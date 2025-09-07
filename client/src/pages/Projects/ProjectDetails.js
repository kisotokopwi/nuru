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
  Empty
} from 'antd';
import {
  ProjectOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;

const ProjectDetails = ({ visible, onCancel, project }) => {
  if (!project) return null;

  const siteColumns = [
    {
      title: 'Site Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Supervisor',
      dataIndex: 'supervisor_name',
      key: 'supervisor_name',
      render: (text) => text || <Text type="secondary">Not assigned</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('DD/MM/YYYY'),
    },
  ];

  return (
    <Modal
      title={
        <div className="modal-title">
          <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Project Details
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={1000}
      className="project-details-modal"
    >
      <div className="project-details">
        {/* Project Information */}
        <Card className="info-card" title="Project Information">
          <Descriptions column={2} size="middle">
            <Descriptions.Item label="Project Name" span={2}>
              <Text strong style={{ fontSize: '16px' }}>
                {project.name}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Client Company">
              <Text>{project.client_company}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={project.is_active ? 'green' : 'red'} style={{ fontSize: '12px' }}>
                {project.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              <Text>{project.created_by_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Created Date">
              <Text>{moment(project.created_at).format('DD/MM/YYYY HH:mm')}</Text>
            </Descriptions.Item>
            {project.description && (
              <Descriptions.Item label="Description" span={2}>
                <Text>{project.description}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Invoice Template */}
        {project.invoice_template && (
          <Card className="template-card" title="Invoice Template Settings">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div className="template-item">
                  <Text strong>Header: </Text>
                  <Text>{project.invoice_template.header}</Text>
                </div>
              </Col>
              <Col span={24}>
                <div className="template-item">
                  <Text strong>Footer: </Text>
                  <Text>{project.invoice_template.footer}</Text>
                </div>
              </Col>
              <Col span={24}>
                <div className="template-item">
                  <Text strong>Include Worker Names: </Text>
                  <Tag color={project.invoice_template.includeWorkerNames ? 'green' : 'red'}>
                    {project.invoice_template.includeWorkerNames ? 'Yes' : 'No'}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* Statistics */}
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Total Sites"
                value={project.site_count || 0}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Active Sites"
                value={project.sites?.filter(s => s.is_active).length || 0}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="stat-card">
              <Statistic
                title="Assigned Supervisors"
                value={project.sites?.filter(s => s.supervisor_id).length || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Sites */}
        <Card 
          className="sites-card" 
          title={
            <div className="card-title">
              <EnvironmentOutlined style={{ marginRight: 8 }} />
              Sites ({project.sites?.length || 0})
            </div>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} size="small">
              Add Site
            </Button>
          }
        >
          {project.sites && project.sites.length > 0 ? (
            <Table
              columns={siteColumns}
              dataSource={project.sites}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No sites found for this project"
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Add First Site
              </Button>
            </Empty>
          )}
        </Card>

        {/* Recent Activity */}
        {project.recent_activity && project.recent_activity.length > 0 && (
          <Card className="activity-card" title="Recent Activity">
            <div className="activity-list">
              {project.recent_activity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-content">
                    <Text strong>{activity.site_name}</Text>
                    <br />
                    <Text type="secondary">
                      {moment(activity.record_date).format('DD/MM/YYYY')} - 
                      {activity.worker_count} workers - 
                      {new Intl.NumberFormat('en-TZ', {
                        style: 'currency',
                        currency: 'TZS',
                        minimumFractionDigits: 0
                      }).format(activity.total_payment)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Divider />

        <div className="modal-footer">
          <Space>
            <Button onClick={onCancel}>
              Close
            </Button>
            <Button type="primary" icon={<EditOutlined />}>
              Edit Project
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectDetails;