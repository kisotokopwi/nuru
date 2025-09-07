import api from './api';

export const invoiceService = {
  getInvoices: (params = {}) => {
    return api.get('/invoices', { params });
  },

  getInvoice: (id) => {
    return api.get(`/invoices/${id}`);
  },

  generateInvoice: (data) => {
    return api.post('/invoices', data);
  },

  updateInvoice: (id, data) => {
    return api.put(`/invoices/${id}`, data);
  },

  deleteInvoice: (id) => {
    return api.delete(`/invoices/${id}`);
  },

  sendInvoice: (id) => {
    return api.post(`/invoices/${id}/send`);
  },

  downloadInvoice: (id, type = 'client') => {
    return api.get(`/invoices/${id}/download/${type}`, {
      responseType: 'blob',
    });
  },

  previewInvoice: (id, type = 'client') => {
    return api.get(`/invoices/${id}/preview/${type}`);
  },

  getInvoicesBySite: (siteId, params = {}) => {
    return api.get(`/invoices/site/${siteId}`, { params });
  },

  getInvoicesByDate: (date, params = {}) => {
    return api.get(`/invoices/date/${date}`, { params });
  },

  getInvoicesByDateRange: (startDate, endDate, params = {}) => {
    return api.get('/invoices/date-range', {
      params: {
        startDate,
        endDate,
        ...params,
      },
    });
  },
};