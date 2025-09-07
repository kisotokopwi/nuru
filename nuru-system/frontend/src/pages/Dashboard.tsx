import React from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  Group,
  LocationOn,
  Assignment,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactElement;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  }> = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: '50%',
              backgroundColor: `${color}.light`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getDashboardContent = () => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.SITE_ADMIN:
        return (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Sites"
                  value={12}
                  icon={<LocationOn />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Active Workers"
                  value={245}
                  icon={<Group />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Today's Records"
                  value={8}
                  icon={<Assignment />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Monthly Production"
                  value="1,234 tons"
                  icon={<TrendingUp />}
                  color="secondary"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <Typography color="textSecondary">
                    Activity feed will be implemented here...
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Alerts
                  </Typography>
                  <Typography color="textSecondary">
                    System alerts will be shown here...
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </>
        );

      case UserRole.SUPERVISOR:
        return (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="My Sites"
                  value={2}
                  icon={<LocationOn />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Today's Workers"
                  value={45}
                  icon={<Group />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <StatCard
                  title="Records to Submit"
                  value={1}
                  icon={<Assignment />}
                  color="warning"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Today's Tasks
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip label="Submit daily record for Site A" color="warning" sx={{ mr: 1, mb: 1 }} />
                    <Chip label="Review worker attendance" color="info" sx={{ mr: 1, mb: 1 }} />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Welcome back, {user?.full_name}!
      </Typography>

      <Box sx={{ mt: 3 }}>
        {getDashboardContent()}
      </Box>
    </Box>
  );
};

export default Dashboard;