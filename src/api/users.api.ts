import { apiRequest } from './client';
import { Role, UserDetail, CreateUserPayload, UpdateUserPayload } from '../types/auth';

export const usersApi = {
  listRoles: async (): Promise<Role[]> => {
    const res = await apiRequest<Role[] | { data: Role[] }>('/roles', {
      method: 'GET',
      storeScoped: false,
    });
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  listUsers: async (params?: { role?: string; store_id?: string; search?: string }): Promise<UserDetail[]> => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.store_id) query.set('store_id', params.store_id);
    if (params?.search) query.set('search', params.search);

    const queryString = query.toString();
    const path = `/users${queryString ? `?${queryString}` : ''}`;

    const res = await apiRequest<UserDetail[] | { data: UserDetail[] } | null>(path, {
      method: 'GET',
      storeScoped: false,
    });

    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  getUser: async (id: string): Promise<UserDetail> => {
    return await apiRequest<UserDetail>(`/users/${encodeURIComponent(id)}`, {
      method: 'GET',
      storeScoped: false,
    });
  },

  createUser: async (payload: CreateUserPayload): Promise<UserDetail> => {
    return await apiRequest<UserDetail>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<UserDetail> => {
    return await apiRequest<UserDetail>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      storeScoped: false,
    });
  },

  toggleUserStatus: async (id: string, isActive: boolean): Promise<void> => {
    await apiRequest<void>(`/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
      storeScoped: false,
    });
  },
};
