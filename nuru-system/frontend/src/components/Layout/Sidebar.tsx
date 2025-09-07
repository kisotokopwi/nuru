import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Assessment as ReportIcon,
  History as AuditIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN, UserRole.SUPERVISOR],
  },
  {
    text: 'Clients',
    icon: <BusinessIcon />,
    path: '/clients',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
  {
    text: 'Projects',
    icon: <LocationIcon />,
    path: '/projects',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
  {
    text: 'Sites',
    icon: <LocationIcon />,
    path: '/sites',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN, UserRole.SUPERVISOR],
  },
  {
    text: 'Users',
    icon: <GroupIcon />,
    path: '/users',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
  {
    text: 'Daily Records',
    icon: <AssignmentIcon />,
    path: '/daily-records',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN, UserRole.SUPERVISOR],
  },
  {
    text: 'Invoices',
    icon: <ReceiptIcon />,
    path: '/invoices',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
  {
    text: 'Reports',
    icon: <ReportIcon />,
    path: '/reports',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
  {
    text: 'Audit Logs',
    icon: <AuditIcon />,
    path: '/audit-logs',
    roles: [UserRole.SUPER_ADMIN, UserRole.SITE_ADMIN],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant = 'temporary' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleItemClick = (path: string) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Nuru System
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Worker Management
        </Typography>
      </Box>
      
      <Divider />
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List>
          {filteredMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleItemClick(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleItemClick('/settings')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;