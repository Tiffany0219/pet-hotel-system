const API_BASE = "http://127.0.0.1:5050/api";

export type AssignmentOptions = {
  roomSpots: Record<"standard" | "deluxe" | "vip", string[]>;
  groomingStations: string[];
  groomingTimes: string[];
};

export type SystemUserPayload = {
  name: string;
  email?: string;
  phone: string;
  password?: string;
  role: "staff" | "groomer" | "caregiver" | "admin";
};

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

  pay: (id: string, payload: { paymentMethod: string }) =>
    request(`/orders/${id}/pay`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  review: (id: string, payload: { rating: number; review: string }) =>
    request(`/orders/${id}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const notificationApi = {
  list: (includeRead = false) =>
    request(`/notifications${includeRead ? "?includeRead=1" : ""}`),

  markRead: (id: string) =>
    request(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllRead: () =>
    request("/notifications/read-all", {
      method: "PATCH",
    }),
};

export const adminApi = {
  stats: () => request("/admin/stats"),

  orders: () => request("/admin/orders"),

  systemUsers: () => request("/admin/system/users"),

  createSystemUser: (payload: Required<SystemUserPayload>) =>
    request("/admin/system/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateSystemUser: (id: string, payload: SystemUserPayload) =>
    request(`/admin/system/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteSystemUser: (id: string) =>
    request(`/admin/system/users/${id}`, {
      method: "DELETE",
    }),

  serviceCatalog: () => request("/admin/system/service-catalog"),

  updateServiceCatalog: (payload: any) =>
    request("/admin/system/service-catalog", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  businessSettings: () => request("/admin/system/business-settings"),

  updateBusinessSettings: (payload: any) =>
    request("/admin/system/business-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  notificationSettings: () => request("/admin/system/notification-settings"),

  updateNotificationSettings: (payload: any) =>
    request("/admin/system/notification-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  assignmentOptions: () => request("/admin/assignments/options"),

  updateAssignmentOptions: (payload: AssignmentOptions) =>
    request("/admin/assignments/options", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateOrderStatus: (id: string, status: string) =>
    request(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateOrderAssignment: (
    id: string,
    payload: {
      assignedSpot: string;
      scheduledTime: string;
      assignmentNote: string;
    }
  ) =>
    request(`/admin/orders/${id}/assignment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateOrderPayment: (
    id: string,
    payload: {
      paymentStatus: "未付款" | "已付訂金" | "已付款";
      paymentMethod: "未設定" | "現金" | "轉帳" | "信用卡" | "線上付款" | "其他";
      paidAmount: number;
    }
  ) =>
    request(`/admin/orders/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  auditLogs: (id: string) => request(`/admin/orders/${id}/audit-logs`),

  careLogs: (id: string) => request(`/admin/orders/${id}/care-logs`),

  createCareLog: (
    id: string,
    payload: {
      logType: string;
      message: string;
      visibleToCustomer: boolean;
    }
  ) =>
    request(`/admin/orders/${id}/care-logs`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const workerApi = {
  schedule: (date: string) => request(`/worker/schedule?date=${date}`),

  updateOrderStatus: (id: string, status: string) =>
    request(`/worker/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  createCareLog: (
    id: string,
    payload: {
      logType: string;
      message: string;
      visibleToCustomer: boolean;
    }
  ) =>
    request(`/worker/orders/${id}/care-logs`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
