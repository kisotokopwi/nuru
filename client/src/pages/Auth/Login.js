import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert, Divider, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, SafetyOutlined, TeamOutlined, BarChartOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await login(values.email, values.password);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)
          `,
        }}
      />

      <Row gutter={[48, 24]} style={{ width: '100%', maxWidth: 1200, zIndex: 1 }}>
        {/* Left Side - Branding */}
        <Col xs={24} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div
              style={{
                width: 120,
                height: 120,
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <TeamOutlined style={{ fontSize: 48, color: 'white' }} />
            </div>
            <Title level={1} style={{ color: 'white', marginBottom: 16, fontSize: 48, fontWeight: 700 }}>
              Nuru Company
            </Title>
            <Title level={3} style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: 24, fontWeight: 300 }}>
              Enhanced Worker Supervision & Invoice Management System
            </Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 16, maxWidth: 400, margin: '0 auto' }}>
              Streamline your workforce management with our comprehensive solution for daily record keeping, 
              invoice generation, and fraud prevention.
            </Paragraph>
            
            <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <SafetyOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Fraud Prevention</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <BarChartOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Real-time Analytics</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <UserOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Role-based Access</div>
                </div>
              </Col>
            </Row>
          </div>
        </Col>

        {/* Right Side - Login Form */}
        <Col xs={24} lg={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card
            style={{
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              borderRadius: 16,
              border: 'none',
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.95)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Title level={2} style={{ margin: 0, color: '#1890ff', fontWeight: 600 }}>
                Welcome Back
              </Title>
              <Text type="secondary" style={{ fontSize: 16 }}>
                Sign in to your account
              </Text>
            </div>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 24, borderRadius: 8 }}
              />
            )}

            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                  placeholder="Enter your email"
                  autoComplete="email"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#1890ff' }} />}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<LoginOutlined />}
                  style={{ 
                    width: '100%', 
                    height: 48, 
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <Divider style={{ margin: '24px 0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Demo Credentials
              </Text>
            </Divider>

            <div style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f6f8fa', 
                  borderRadius: 6,
                  border: '1px solid #e1e4e8'
                }}>
                  <Text strong style={{ fontSize: 12, color: '#1890ff' }}>Super Admin</Text>
                  <br />
                  <Text code style={{ fontSize: 11, color: '#666' }}>
                    admin@nurucompany.com / admin123
                  </Text>
                </div>
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f6f8fa', 
                  borderRadius: 6,
                  border: '1px solid #e1e4e8'
                }}>
                  <Text strong style={{ fontSize: 12, color: '#52c41a' }}>Site Admin</Text>
                  <br />
                  <Text code style={{ fontSize: 11, color: '#666' }}>
                    siteadmin@nurucompany.com / admin123
                  </Text>
                </div>
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#f6f8fa', 
                  borderRadius: 6,
                  border: '1px solid #e1e4e8'
                }}>
                  <Text strong style={{ fontSize: 12, color: '#faad14' }}>Supervisor</Text>
                  <br />
                  <Text code style={{ fontSize: 11, color: '#666' }}>
                    supervisor@nurucompany.com / supervisor123
                  </Text>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login;