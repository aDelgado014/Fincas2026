// Shared authenticated fetch utility
// Automatically injects Authorization: Bearer <token> header from localStorage

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers((options.headers as HeadersInit) || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}
