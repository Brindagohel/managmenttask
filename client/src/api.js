const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Small fetch wrapper: adds the JWT and throws readable errors.
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// Download a file from the API (needs the login token, so a plain link will not work)
export async function downloadFile(path, filename) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}