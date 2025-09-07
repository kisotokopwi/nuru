import api from './api';
import { Client, ClientCreateRequest } from '../types';

export const clientsService = {
  // Get all clients
  async getClients(params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<Client[]> {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  // Get client by ID
  async getClient(id: number): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Create new client
  async createClient(clientData: ClientCreateRequest): Promise<Client> {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  // Update client
  async updateClient(id: number, clientData: Partial<ClientCreateRequest>): Promise<Client> {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  },

  // Delete client
  async deleteClient(id: number): Promise<void> {
    await api.delete(`/clients/${id}`);
  },
};