import { describe, it, expect } from 'vitest';
import { normalizeApiError, AppApiError } from '../api/errors';

describe('API Error Normalization', () => {
  it('normalizes standard 401 unauthorized error', () => {
    const err = normalizeApiError(401, { code: 'UNAUTHENTICATED', error: 'Token expired' });
    expect(err).toBeInstanceOf(AppApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHENTICATED');
    expect(err.message).toBe('Token expired');
  });

  it('normalizes 403 forbidden error', () => {
    const err = normalizeApiError(403, null);
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toContain('Akses ditolak');
  });

  it('normalizes 422 validation error with details', () => {
    const err = normalizeApiError(422, {
      code: 'VALIDATION_ERROR',
      error: 'Data tidak valid',
      details: { sku: 'SKU sudah digunakan' },
    });
    expect(err.status).toBe(422);
    expect(err.details).toEqual({ sku: 'SKU sudah digunakan' });
  });

  it('normalizes 500 server error', () => {
    const err = normalizeApiError(500, null);
    expect(err.status).toBe(500);
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
