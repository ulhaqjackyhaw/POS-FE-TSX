export type ID = string;
export type ISODateTime = string;

export interface PaginationMeta {
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  code: string;
  error: string;
  request_id?: string;
  details?: unknown;
}
