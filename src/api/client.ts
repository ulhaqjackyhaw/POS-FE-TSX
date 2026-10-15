import { useAppContextStore } from '../stores/app-context.store';
import { normalizeApiError } from './errors';

export interface RequestOptions extends RequestInit {
  storeScoped?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    storeScoped = true,
    idempotencyKey,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers: customHeaders,
    ...restOptions
  } = options;

  const { token, activeStoreId, logout } = useAppContextStore.getState();

  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  if (restOptions.body && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (storeScoped !== false && activeStoreId) {
    headers.set('X-Store-ID', activeStoreId);
  }

  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey);
  }

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = restOptions.signal
    ? // If caller supplied a signal, race them
      anySignal([restOptions.signal, controller.signal])
    : controller.signal;

  try {
    const fullPath = path.startsWith('/api/v1') ? path : `/api/v1${path}`;
    const response = await fetch(fullPath, {
      ...restOptions,
      headers,
      signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 204) {
      return null as T;
    }

    const responseText = await response.text();
    let responseBody: unknown = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = { error: responseText };
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Clear session on unauthenticated
        logout();
      }
      throw normalizeApiError(response.status, responseBody);
    }

    return responseBody as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw normalizeApiError(408, {
        code: 'REQUEST_TIMEOUT',
        error: 'Permintaan ke server melebihi batas waktu (timeout). Silakan periksa koneksi Anda.',
      });
    }

    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }

    // Network error / offline
    throw normalizeApiError(0, {
      code: 'NETWORK_ERROR',
      error: 'Tidak dapat terhubung ke server backend. Periksa koneksi internet atau status server.',
    });
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
