import { apiClient } from './client.js';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperadmin: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    if (res.data.accessToken) {
      localStorage.setItem('voko_token', res.data.accessToken);
    }
    return res.data;
  },

  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<AuthUser>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('voko_token');
    }
  },
};
