import { ID } from './common';

export interface UserSummary {
  id: ID;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  permissions: string[];
  store_ids?: ID[] | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserSummary;
}

export interface AppSession {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  permissions: string[];
  token: string;
}

export interface Role {
  id: ID;
  code: string;
  name: string;
  description?: string;
}

export interface UserDetail {
  id: ID;
  username: string;
  email: string;
  full_name: string;
  role_id: ID;
  role_code?: string;
  role_name?: string;
  store_ids?: ID[];
  stores?: Array<{ id: ID; code: string; name: string }>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role_code: string;
  role_id?: string;
  store_ids?: string[];
}

export interface UpdateUserPayload {
  full_name: string;
  email: string;
  password?: string;
  role_code: string;
  role_id?: string;
  is_active?: boolean;
  store_ids?: string[];
}
