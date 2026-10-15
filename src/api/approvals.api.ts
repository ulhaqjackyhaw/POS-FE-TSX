import { apiRequest } from './client';
import { ApprovalRequest } from '../types/api';

export interface CreateApprovalPayload {
  action_type: string;
  reason: string;
  payload: Record<string, unknown>;
  store_id?: string;
}

export interface ReviewApprovalPayload {
  decision: 'approve' | 'reject';
  rejection_reason?: string;
  note?: string;
}

export const approvalsApi = {
  listApprovals: async (params?: { status?: string; store_id?: string }): Promise<ApprovalRequest[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.store_id) query.set('store_id', params.store_id);

      const q = query.toString();
      const res = await apiRequest<ApprovalRequest[] | { data: ApprovalRequest[] } | null>(
        `/approvals${q ? `?${q}` : ''}`,
        { method: 'GET' }
      );

      if (Array.isArray(res)) return res;
      if (res && 'data' in res && Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  createApproval: async (payload: CreateApprovalPayload): Promise<ApprovalRequest> => {
    return await apiRequest<ApprovalRequest>('/approvals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  reviewApproval: async (id: string, payload: ReviewApprovalPayload): Promise<ApprovalRequest> => {
    return await apiRequest<ApprovalRequest>(
      `/approvals/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
};
