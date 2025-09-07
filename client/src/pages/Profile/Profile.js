import React, { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  message,
  Avatar,
  Divider,
  Tag,
  Space,
  Upload,
  Modal,
  Alert,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const { Title, Text } = Typography;

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation(
    (data) => userService.updateProfile(currentUser.id, data),
    {
      onSuccess: () => {
        message.success('Profile updated successfully');
        queryClient.invalidateQueries(['user']);
        setIsEditing(false);
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const changePasswordMutation = useMutation(
    (data) => userService.changePassword(data),
    {
      onSuccess: () => {
        message.success('Password changed successfully');
        setIsPasswordModalVisible(false);
        passwordForm.resetFields();
      },
      onError: (error) => {
        message.error(error.response?.data?.message || 'Failed to change password');
      },
    }
  );

  const handleEditProfile = () => {
    setIsEditing(true);
    form.setFieldsValue({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      phone: currentUser.phone,
      address: currentUser.address,
    });
  };

  const handleSaveProfile = () => {
    form.validateFields().then((values) => {
      updateProfileMutation.mutate(values);
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const handleChangePassword = () => {
    passwordForm.validateFields().then((values) => {
      changePasswordMutation.mutate(values);
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'red';
      case 'site_admin':
        return 'blue';
      case 'supervisor':
        return 'green';
      default:
        return 'default';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Administrator';
      case 'site_admin':
        return 'Site Administrator';
      case 'supervisor':
        return 'Supervisor';
      default:
        return role;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>My Profile</Title>
        <Text type="secondary">Manage your account information and settings</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card
            title="Profile Information"
            extra={
              !isEditing ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEditProfile}
                >
                  Edit Profile
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveProfile}
                    loading={updateProfileMutation.isLoading}
                  >
                    Save Changes
                  </Button>
                </Space>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              disabled={!isEditing}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[
                      { required: true, message: 'Please input your first name!' },
                      { min: 2, message: 'First name must be at least 2 characters!' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Enter your first name"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[
                      { required: true, message: 'Please input your last name!' },
                      { min: 2, message: 'Last name must be at least 2 characters!' },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Enter your last name"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Enter your email address"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[
                  { required: true, message: 'Please input your phone number!' },
                  { pattern: /^[0-9+\-\s()]+$/, message: 'Please enter a valid phone number!' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="Enter your phone number"
                />
              </Form.Item>

              <Form.Item
                name="address"
                label="Address"
              >
                <Input.TextArea
                  prefix={<EnvironmentOutlined />}
                  placeholder="Enter your address"
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Profile Summary */}
        <Col xs={24} lg={8}>
          <Card title="Profile Summary">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar
                size={100}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
              <div style={{ marginTop: 16 }}>
                <Title level={4}>
                  {currentUser?.firstName} {currentUser?.lastName}
                </Title>
                <Text type="secondary">{currentUser?.email}</Text>
              </div>
            </div>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Text strong>Role:</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={getRoleColor(currentUser?.role)}>
                  {getRoleText(currentUser?.role)}
                </Tag>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Phone:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{currentUser?.phone || 'Not provided'}</Text>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Address:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{currentUser?.address || 'Not provided'}</Text>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Member Since:</Text>
              <div style={{ marginTop: 8 }}>
                <Text>{new Date(currentUser?.createdAt).toLocaleDateString()}</Text>
              </div>
            </div>

            <Divider />

            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={() => setIsPasswordModalVisible(true)}
              block
            >
              Change Password
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={isPasswordModalVisible}
        onOk={handleChangePassword}
        onCancel={() => {
          setIsPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        confirmLoading={changePasswordMutation.isLoading}
        width={500}
      >
        <Alert
          message="Password Requirements"
          description="Your new password must be at least 8 characters long and contain a mix of letters, numbers, and special characters."
          type="info"
          style={{ marginBottom: 24 }}
          showIcon
        />

        <Form
          form={passwordForm}
          layout="vertical"
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: 'Please input your current password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your current password"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please input your new password!' },
              { min: 8, message: 'Password must be at least 8 characters!' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: 'Password must contain uppercase, lowercase, number, and special character!',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your new password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm your new password"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;