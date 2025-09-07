import api from './api';

export const dashboardService = {
  getDashboardData: async (date) => {
    const response = await api.get('/reports/dashboard', {
      params: { date },
    });
    return response.data;
  },
};