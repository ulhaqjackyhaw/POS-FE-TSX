import { apiRequest } from './client';
import { LoginResponse, UserSummary } from '../types/auth';

export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
    return await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      storeScoped: false,
    });
  },

  getMe: async (): Promise<UserSummary> => {
    return await apiRequest<UserSummary>('/auth/me', {
      method: 'GET',
      storeScoped: false,
    });
  },
};
