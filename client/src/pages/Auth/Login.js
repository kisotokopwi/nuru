import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (values) => {
    setLoading(true);
    const result = await login(values);
    setLoading(false);
    
    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleDemoLogin = async (role) => {
    const credentials = {
      username: role === 'admin' ? 'admin' : role === 'siteadmin' ? 'siteadmin' : 'supervisor1',
      password: 'admin123'
    };
    
    setLoading(true);
    const result = await login(credentials);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-content">
          <Card className="login-card" bordered={false}>
            <div className="login-header">
              <div className="logo">
                <Title level={2} className="logo-title">
                  Nuru Company
                </Title>
                <Text className="logo-subtitle">
                  Worker Management System
                </Text>
              </div>
            </div>

            <Title level={3} className="login-title">
              Sign In
            </Title>

            {error && (
              <Alert
                message="Login Failed"
                description={error}
                type="error"
                showIcon
                className="login-alert"
              />
            )}

            <Form
              form={form}
              name="login"
              onFinish={handleSubmit}
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: 'Please enter your username!' },
                  { min: 3, message: 'Username must be at least 3 characters!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  placeholder="Username or Email"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Please enter your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder="Password"
                  autoComplete="current-password"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-button"
                  loading={loading}
                  block
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <div className="demo-section">
              <Text className="demo-title">Demo Accounts:</Text>
              <div className="demo-buttons">
                <Button
                  type="dashed"
                  size="small"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={loading}
                  className="demo-button"
                >
                  Super Admin
                </Button>
                <Button
                  type="dashed"
                  size="small"
                  onClick={() => handleDemoLogin('siteadmin')}
                  disabled={loading}
                  className="demo-button"
                >
                  Site Admin
                </Button>
                <Button
                  type="dashed"
                  size="small"
                  onClick={() => handleDemoLogin('supervisor')}
                  disabled={loading}
                  className="demo-button"
                >
                  Supervisor
                </Button>
              </div>
              <Text className="demo-note">
                All demo accounts use password: <strong>admin123</strong>
              </Text>
            </div>

            <div className="login-footer">
              <Text className="footer-text">
                © 2024 Nuru Company. All rights reserved.
              </Text>
            </div>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Login;