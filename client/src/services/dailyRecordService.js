import api from './api';

export const dailyRecordService = {
  getDailyRecords: (params = {}) => {
    return api.get('/daily-records', { params });
  },

  getDailyRecord: (id) => {
    return api.get(`/daily-records/${id}`);
  },

  createDailyRecord: (data) => {
    return api.post('/daily-records', data);
  },

  updateDailyRecord: (id, data) => {
    return api.put(`/daily-records/${id}`, data);
  },

  deleteDailyRecord: (id) => {
    return api.delete(`/daily-records/${id}`);
  },

  getDailyRecordsBySite: (siteId, params = {}) => {
    return api.get(`/daily-records/site/${siteId}`, { params });
  },

  getDailyRecordsByDate: (date, params = {}) => {
    return api.get(`/daily-records/date/${date}`, { params });
  },

  getDailyRecordsByDateRange: (startDate, endDate, params = {}) => {
    return api.get('/daily-records/date-range', {
      params: {
        startDate,
        endDate,
        ...params,
      },
    });
  },
};