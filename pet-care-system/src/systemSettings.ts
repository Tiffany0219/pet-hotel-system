import { API_BASE } from "./config";

export type RoomType = "standard" | "deluxe" | "vip";
export type GroomingService = "basic" | "styling" | "spa";

export type ServiceCatalog = {
  roomPrices: Record<RoomType, number>;
  groomingPrices: Record<GroomingService, number>;
  groomingTimes: string[];
};

export type BusinessSettings = {
  weekdayHours: string;
  weekendHours: string;
  closedDates: string[];
  shifts: string[];
};

export type NotificationSettings = {
  bookingReminderHours: number;
  paymentReminderHours: number;
  careLogNotifyCustomer: boolean;
  channels: string[];
  staffReminderText: string;
};

export type PublicSystemSettings = {
  serviceCatalog: ServiceCatalog;
  businessSettings: BusinessSettings;
  notificationSettings: NotificationSettings;
};

export const defaultServiceCatalog: ServiceCatalog = {
  roomPrices: {
    standard: 800,
    deluxe: 1200,
    vip: 2000,
  },
  groomingPrices: {
    basic: 600,
    styling: 1200,
    spa: 1800,
  },
  groomingTimes: ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"],
};

export const defaultBusinessSettings: BusinessSettings = {
  weekdayHours: "09:00 - 21:00",
  weekendHours: "09:00 - 21:00",
  closedDates: [],
  shifts: ["早班 09:00-15:00", "晚班 15:00-21:00"],
};

export const defaultNotificationSettings: NotificationSettings = {
  bookingReminderHours: 24,
  paymentReminderHours: 12,
  careLogNotifyCustomer: true,
  channels: ["站內通知", "Email"],
  staffReminderText: "請確認今日入住、退房、美容與待收款項目。",
};

export const defaultPublicSystemSettings: PublicSystemSettings = {
  serviceCatalog: defaultServiceCatalog,
  businessSettings: defaultBusinessSettings,
  notificationSettings: defaultNotificationSettings,
};

export async function fetchPublicSystemSettings(): Promise<PublicSystemSettings> {
  const response = await fetch(`${API_BASE}/public/system-settings`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "讀取系統設定失敗");
  }

  return {
    serviceCatalog: {
      ...defaultServiceCatalog,
      ...data.serviceCatalog,
      roomPrices: {
        ...defaultServiceCatalog.roomPrices,
        ...data.serviceCatalog?.roomPrices,
      },
      groomingPrices: {
        ...defaultServiceCatalog.groomingPrices,
        ...data.serviceCatalog?.groomingPrices,
      },
      groomingTimes:
        data.serviceCatalog?.groomingTimes || defaultServiceCatalog.groomingTimes,
    },
    businessSettings: {
      ...defaultBusinessSettings,
      ...data.businessSettings,
    },
    notificationSettings: {
      ...defaultNotificationSettings,
      ...data.notificationSettings,
    },
  };
}

export function priceText(value: number) {
  return `NT$ ${value.toLocaleString()}`;
}
