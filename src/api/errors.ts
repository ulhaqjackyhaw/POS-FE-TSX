export class AppApiError extends Error {
  code: string;
  status: number;
  requestId?: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', requestId?: string, details?: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export function normalizeApiError(status: number, body: unknown): AppApiError {
  let message = 'Terjadi kesalahan sistem';
  let code = 'ERROR';
  let requestId: string | undefined;
  let details: unknown;

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj.error === 'string') message = obj.error;
    else if (typeof obj.message === 'string') message = obj.message;

    if (typeof obj.code === 'string') code = obj.code;
    if (typeof obj.request_id === 'string') requestId = obj.request_id;
    if (obj.details !== undefined) details = obj.details;
  }

  // Fallback messages and codes for standard HTTP status codes
  if (status === 401) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Sesi telah berakhir atau kredensial tidak valid';
    if (code === 'ERROR') code = 'UNAUTHENTICATED';
  } else if (status === 403) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Akses ditolak: Anda tidak memiliki izin untuk aksi ini';
    if (code === 'ERROR') code = 'FORBIDDEN';
  } else if (status === 404) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Data atau endpoint tidak ditemukan';
    if (code === 'ERROR') code = 'NOT_FOUND';
  } else if (status === 409) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Terjadi konflik data atau status tidak sesuai';
    if (code === 'ERROR') code = 'CONFLICT';
  } else if (status === 422 || status === 400) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Validasi request gagal';
    if (code === 'ERROR') code = 'VALIDATION_ERROR';
  } else if (status >= 500) {
    if (!message || message === 'Terjadi kesalahan sistem') message = 'Terjadi gangguan internal pada server';
    if (code === 'ERROR') code = 'INTERNAL_SERVER_ERROR';
  }

  return new AppApiError(status, message, code, requestId, details);
}
