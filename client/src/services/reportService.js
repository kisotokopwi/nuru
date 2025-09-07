import api from './api';

export const reportService = {
  getDashboardData: () => {
    return api.get('/reports/dashboard');
  },

  getDailyReport: (params = {}) => {
    return api.get('/reports/daily', { params });
  },

  getWeeklyReport: (params = {}) => {
    return api.get('/reports/weekly', { params });
  },

  getMonthlyReport: (params = {}) => {
    return api.get('/reports/monthly', { params });
  },

  getSitePerformance: (params = {}) => {
    return api.get('/reports/site-performance', { params });
  },

  getWorkerTypeAnalysis: (params = {}) => {
    return api.get('/reports/worker-type-analysis', { params });
  },

  getPaymentAnalysis: (params = {}) => {
    return api.get('/reports/payment-analysis', { params });
  },

  getProductivityReport: (params = {}) => {
    return api.get('/reports/productivity', { params });
  },

  exportReport: (type, params = {}) => {
    return api.get(`/reports/export/${type}`, { 
      params,
      responseType: 'blob',
    });
  },
};