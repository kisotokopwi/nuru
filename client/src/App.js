import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Projects from './pages/Projects/Projects';
import Sites from './pages/Sites/Sites';
import Workers from './pages/Workers/Workers';
import Supervisors from './pages/Supervisors/Supervisors';
import DailyRecords from './pages/DailyRecords/DailyRecords';
import Invoices from './pages/Invoices/Invoices';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import Audit from './pages/Audit/Audit';
import Profile from './pages/Profile/Profile';

// Styles
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Projects */}
                <Route 
                  path="projects" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Projects />
                    </ProtectedRoute>
                  } 
                />

                {/* Sites */}
                <Route 
                  path="sites" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Sites />
                    </ProtectedRoute>
                  } 
                />

                {/* Worker Types */}
                <Route 
                  path="workers" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Workers />
                    </ProtectedRoute>
                  } 
                />

                {/* Supervisors */}
                <Route 
                  path="supervisors" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Supervisors />
                    </ProtectedRoute>
                  } 
                />

                {/* Daily Records */}
                <Route path="records" element={<DailyRecords />} />

                {/* Invoices */}
                <Route 
                  path="invoices" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Invoices />
                    </ProtectedRoute>
                  } 
                />

                {/* Reports */}
                <Route path="reports" element={<Reports />} />

                {/* Users (Super Admin only) */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin']}>
                      <Users />
                    </ProtectedRoute>
                  } 
                />

                {/* Audit Trail (Admin only) */}
                <Route 
                  path="audit" 
                  element={
                    <ProtectedRoute requiredRoles={['super_admin', 'site_admin']}>
                      <Audit />
                    </ProtectedRoute>
                  } 
                />

                {/* Profile */}
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;