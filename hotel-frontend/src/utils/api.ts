interface ApiError {
  message?: string;
  detail?: string;
  title?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiError | null;
    const detail = errorBody?.message ?? errorBody?.detail ?? errorBody?.title;
    throw new Error(
      detail ? `${detail} (HTTP ${response.status})` : `Ошибка сервера: HTTP ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
