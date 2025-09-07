import api from './api';

export const workerTypeService = {
  getWorkerTypes: (params = {}) => {
    return api.get('/worker-types', { params });
  },

  getWorkerType: (id) => {
    return api.get(`/worker-types/${id}`);
  },

  createWorkerType: (data) => {
    return api.post('/worker-types', data);
  },

  updateWorkerType: (id, data) => {
    return api.put(`/worker-types/${id}`, data);
  },

  deleteWorkerType: (id) => {
    return api.delete(`/worker-types/${id}`);
  },

  getWorkerTypesBySite: (siteId) => {
    return api.get(`/worker-types/site/${siteId}`);
  },
};