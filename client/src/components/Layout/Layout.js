import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout as AntLayout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Button, 
  Badge,
  Drawer,
  Typography
} from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  AuditOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const Layout = () => {
  const { user, logout, isSuperAdmin, isSiteAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  // Menu items based on user role
  const getMenuItems = () => {
    const items = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/records',
        icon: <FileTextOutlined />,
        label: 'Daily Records',
      },
    ];

    if (isSiteAdmin()) {
      items.push(
        {
          key: '/projects',
          icon: <ProjectOutlined />,
          label: 'Projects',
        },
        {
          key: '/sites',
          icon: <EnvironmentOutlined />,
          label: 'Sites',
        },
        {
          key: '/workers',
          icon: <TeamOutlined />,
          label: 'Worker Types',
        },
        {
          key: '/supervisors',
          icon: <UserOutlined />,
          label: 'Supervisors',
        },
        {
          key: '/invoices',
          icon: <FilePdfOutlined />,
          label: 'Invoices',
        }
      );
    }

    items.push({
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Reports',
    });

    if (isSiteAdmin()) {
      items.push({
        key: '/audit',
        icon: <AuditOutlined />,
        label: 'Audit Trail',
      });
    }

    if (isSuperAdmin()) {
      items.push({
        key: '/users',
        icon: <UserOutlined />,
        label: 'Users',
      });
    }

    return items;
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  // Handle menu click
  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileDrawerVisible(false);
  };

  // Get user role display name
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

  // Get user role color
  const getUserRoleColor = () => {
    switch (user?.role) {
      case 'super_admin':
        return '#e74c3c';
      case 'site_admin':
        return '#f39c12';
      case 'supervisor':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  return (
    <AntLayout className="app-layout">
      {/* Mobile Header */}
      <Header className="mobile-header">
        <div className="mobile-header-content">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileDrawerVisible(true)}
            className="mobile-menu-button"
          />
          <div className="mobile-header-title">
            <Text strong>Nuru Management</Text>
          </div>
          <div className="mobile-header-actions">
            <Badge count={0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="notification-button"
              />
            </Badge>
          </div>
        </div>
      </Header>

      {/* Desktop Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="desktop-sidebar"
        width={250}
        collapsedWidth={80}
      >
        <div className="sidebar-header">
          <div className="logo">
            <Text strong className="logo-text">
              {collapsed ? 'NM' : 'Nuru Management'}
            </Text>
          </div>
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className="sidebar-menu"
        />
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        title="Navigation"
        placement="left"
        onClose={() => setMobileDrawerVisible(false)}
        open={mobileDrawerVisible}
        className="mobile-drawer"
        width={250}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className="mobile-menu"
        />
      </Drawer>

      <AntLayout className="site-layout">
        {/* Desktop Header */}
        <Header className="desktop-header">
          <div className="header-content">
            <div className="header-left">
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="collapse-button"
              />
              <Text className="page-title">
                {getMenuItems().find(item => item.key === location.pathname)?.label || 'Dashboard'}
              </Text>
            </div>
            
            <div className="header-right">
              <Badge count={0} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="notification-button"
                />
              </Badge>
              
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <div className="user-info">
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />}
                    className="user-avatar"
                  />
                  <div className="user-details">
                    <Text strong className="user-name">
                      {user?.full_name}
                    </Text>
                    <Text 
                      className="user-role"
                      style={{ color: getUserRoleColor() }}
                    >
                      {getUserRoleDisplay()}
                    </Text>
                  </div>
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>

        <Content className="site-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;