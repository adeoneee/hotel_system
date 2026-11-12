import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';

function createResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends a bearer token when it is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(200, { id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/rooms', {}, 'test-token');

    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(requestOptions.headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('sets JSON content type when request has a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/auth/login', { method: 'POST', body: '{}' });

    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(requestOptions.headers).get('Content-Type')).toBe('application/json');
  });

  it('returns undefined for a no-content response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createResponse(204)));

    await expect(apiRequest<void>('/api/rooms/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('includes server error details in the thrown error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createResponse(404, { detail: 'Номер не найден' }))
    );

    await expect(apiRequest('/api/rooms/999')).rejects.toThrow('Номер не найден (HTTP 404)');
  });

  it('supports the message field in API error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createResponse(400, { message: 'Некорректный запрос' }))
    );

    await expect(apiRequest('/api/rooms')).rejects.toThrow('Некорректный запрос (HTTP 400)');
  });

  it('supports the title field in API error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createResponse(400, { title: 'Ошибка запроса' }))
    );

    await expect(apiRequest('/api/rooms')).rejects.toThrow('Ошибка запроса (HTTP 400)');
  });

  it('uses a fallback message when the error response has no details', async () => {
    const response = createResponse(500);
    vi.mocked(response.json).mockRejectedValue(new Error('Invalid JSON'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await expect(apiRequest('/api/rooms')).rejects.toThrow('Ошибка сервера: HTTP 500');
  });
});
