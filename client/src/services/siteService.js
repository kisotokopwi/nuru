import api from './api';

export const siteService = {
  getSites: async (params = {}) => {
    const response = await api.get('/sites', { params });
    return response.data;
  },

  getSite: async (id) => {
    const response = await api.get(`/sites/${id}`);
    return response.data;
  },

  createSite: async (siteData) => {
    const response = await api.post('/sites', siteData);
    return response.data;
  },

  updateSite: async (id, siteData) => {
    const response = await api.put(`/sites/${id}`, siteData);
    return response.data;
  },

  deleteSite: async (id) => {
    const response = await api.delete(`/sites/${id}`);
    return response.data;
  },

  assignSupervisor: async (siteId, supervisorId) => {
    const response = await api.post(`/sites/${siteId}/assign-supervisor`, {
      supervisorId,
    });
    return response.data;
  },

  removeSupervisor: async (siteId) => {
    const response = await api.delete(`/sites/${siteId}/remove-supervisor`);
    return response.data;
  },
};