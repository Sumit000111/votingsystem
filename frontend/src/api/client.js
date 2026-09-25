/**
 * Thin fetch wrapper for the Express API. Voter and admin sessions are kept
 * apart so an admin signing in never changes what a voter sees (and vice versa).
 */

const TOKEN_KEYS = { voter: 'nvs.voterToken', admin: 'nvs.adminToken' };

export const session = {
  get(scope) {
    try {
      return localStorage.getItem(TOKEN_KEYS[scope]);
    } catch {
      return null;
    }
  },
  set(scope, token) {
    try {
      localStorage.setItem(TOKEN_KEYS[scope], token);
    } catch {
      /* storage unavailable (private mode) — session lasts for this page only */
    }
  },
  clear(scope) {
    try {
      localStorage.removeItem(TOKEN_KEYS[scope]);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const listeners = new Set();
/** Called with the scope whenever the API rejects a session (401). */
export function onSessionExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function api(path, { method = 'GET', body, auth } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = session.get(auth);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.success === false)) {
    if (res.status === 401 && auth) {
      session.clear(auth);
      listeners.forEach((fn) => fn(auth));
    }
    throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}

export const get = (path, auth) => api(path, { auth });
export const post = (path, body, auth) => api(path, { method: 'POST', body, auth });
export const put = (path, body, auth) => api(path, { method: 'PUT', body, auth });
export const patch = (path, body, auth) => api(path, { method: 'PATCH', body, auth });
