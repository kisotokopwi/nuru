import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Alert,
  message,
  Tabs,
  Avatar,
  Tag,
  Descriptions
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './Profile.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Profile = () => {
  const { user, updateUser, changePassword } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (values) => {
    setLoading(true);
    try {
      const result = await updateUser(values);
      if (result.success) {
        message.success('Profile updated successfully');
      } else {
        message.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      message.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values) => {
    setPasswordLoading(true);
    try {
      const result = await changePassword(values);
      if (result.success) {
        message.success('Password changed successfully');
        passwordForm.resetFields();
      } else {
        message.error(result.error || 'Failed to change password');
      }
    } catch (error) {
      message.error('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getUserRoleDisplay = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'site_admin':
        return 'Site Administrator';
      case 'supervisor':
        return 'Supervisor';
      default:
        return 'User';
    }
  };

  const getUserRoleColor = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'red';
      case 'site_admin':
        return 'orange';
      case 'supervisor':
        return 'green';
      default:
        return 'default';
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="header-content">
          <div className="header-left">
            <Title level={2} className="page-title">
              <UserOutlined /> Profile
            </Title>
            <Text type="secondary">
              Manage your account information and security settings
            </Text>
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Overview */}
        <Col xs={24} lg={8}>
          <Card className="profile-overview-card">
            <div className="profile-avatar-section">
              <Avatar size={80} icon={<UserOutlined />} className="profile-avatar" />
              <div className="profile-info">
                <Title level={4} className="profile-name">
                  {user?.full_name}
                </Title>
                <Text type="secondary" className="profile-username">
                  @{user?.username}
                </Text>
                <div className="profile-role">
                  <Tag color={getUserRoleColor()} className="role-tag">
                    {getUserRoleDisplay()}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Email">
                <Text>{user?.email}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <Text>{user?.phone || 'Not provided'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Member Since">
                <Text>{new Date(user?.created_at).toLocaleDateString()}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Profile Settings */}
        <Col xs={24} lg={16}>
          <Card className="profile-settings-card">
            <Tabs defaultActiveKey="profile" className="profile-tabs">
              <TabPane tab="Profile Information" key="profile">
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleProfileUpdate}
                  initialValues={{
                    full_name: user?.full_name,
                    phone: user?.phone
                  }}
                  className="profile-form"
                >
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="full_name"
                        label="Full Name"
                        rules={[
                          { required: true, message: 'Please enter your full name' },
                          { min: 2, message: 'Full name must be at least 2 characters' }
                        ]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Enter your full name"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[
                          { pattern: /^[\+]?[1-9][\d]{0,15}$/, message: 'Please enter a valid phone number' }
                        ]}
                      >
                        <Input
                          placeholder="Enter your phone number"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="email"
                        label="Email Address"
                      >
                        <Input
                          value={user?.email}
                          disabled
                          size="large"
                          suffix={<Text type="secondary">Cannot be changed</Text>}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="username"
                        label="Username"
                      >
                        <Input
                          value={user?.username}
                          disabled
                          size="large"
                          suffix={<Text type="secondary">Cannot be changed</Text>}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div className="form-actions">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={loading}
                      size="large"
                    >
                      Update Profile
                    </Button>
                  </div>
                </Form>
              </TabPane>

              <TabPane tab="Security" key="security">
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                  className="password-form"
                >
                  <Alert
                    message="Change Password"
                    description="Enter your current password and choose a new secure password."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="current_password"
                        label="Current Password"
                        rules={[
                          { required: true, message: 'Please enter your current password' }
                        ]}
                      >
                        <Input.Password
                          prefix={<LockOutlined />}
                          placeholder="Enter your current password"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="new_password"
                        label="New Password"
                        rules={[
                          { required: true, message: 'Please enter a new password' },
                          { min: 6, message: 'Password must be at least 6 characters' }
                        ]}
                      >
                        <Input.Password
                          prefix={<KeyOutlined />}
                          placeholder="Enter your new password"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="confirm_password"
                        label="Confirm New Password"
                        dependencies={['new_password']}
                        rules={[
                          { required: true, message: 'Please confirm your new password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('new_password') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Passwords do not match'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<KeyOutlined />}
                          placeholder="Confirm your new password"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div className="form-actions">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<LockOutlined />}
                      loading={passwordLoading}
                      size="large"
                    >
                      Change Password
                    </Button>
                  </div>
                </Form>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;