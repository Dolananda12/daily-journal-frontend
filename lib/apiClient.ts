/**
 * Thin wrapper around fetch() that prepends the Spring Boot API base URL.
 *
 * In development (.env.local): NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
 * In production (Vercel):      NEXT_PUBLIC_API_BASE_URL=https://your-api.onrender.com
 *
 * Usage — replace every:
 *   fetch('/api/...')
 * with:
 *   apiFetch('/api/...')
 *
 * All other options (method, headers, body) are passed through unchanged.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, init)
}
