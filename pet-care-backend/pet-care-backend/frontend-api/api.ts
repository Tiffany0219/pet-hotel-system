const API_BASE = "http://127.0.0.1:5000/api";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "API request failed");
  }

  return data;
}

export const authApi = {
  register: (payload: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () => request("/auth/me"),
};

export const petApi = {
  list: () => request("/pets"),

  create: (payload: any) =>
    request("/pets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: any) =>
    request(`/pets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    request(`/pets/${id}`, {
      method: "DELETE",
    }),
};

export const orderApi = {
  list: () => request("/orders"),

  create: (payload: any) =>
    request("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  cancel: (id: string) =>
    request(`/orders/${id}/cancel`, {
      method: "PATCH",
    }),

  pay: (id: string) =>
    request(`/orders/${id}/pay`, {
      method: "PATCH",
    }),

  updateStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  review: (id: string, payload: { rating: number; review: string }) =>
    request(`/orders/${id}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
