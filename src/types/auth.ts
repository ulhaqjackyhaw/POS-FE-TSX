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
