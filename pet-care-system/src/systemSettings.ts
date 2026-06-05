import { API_BASE } from "./config";

export type RoomType = "standard" | "deluxe" | "vip";
export type GroomingService = "basic" | "styling" | "spa";

export type ServiceCatalog = {
  roomPrices: Record<RoomType, number>;
  groomingPrices: Record<GroomingService, number>;
  groomingTimes: string[];
  addOnServices: Record<
    string,
    {
      id: string;
      name: string;
      price: number;
      description: string;
    }
  >;
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
  addOnServices: {
    pickup: {
      id: "pickup",
      name: "到店接送",
      price: 300,
      description: "由店家協助定點接送毛孩。",
    },
    medication: {
      id: "medication",
      name: "餵藥與特殊照護",
      price: 200,
      description: "依家長交代協助用藥、觀察食慾與精神。",
    },
    care_report: {
      id: "care_report",
      name: "照片照護回報",
      price: 150,
      description: "服務期間提供照片與照護狀態回報。",
    },
    walk: {
      id: "walk",
      name: "散步加購",
      price: 180,
      description: "住宿或托育期間加一次散步活動。",
    },
    checkout_grooming: {
      id: "checkout_grooming",
      name: "退房前洗澡",
      price: 500,
      description: "住宿退房前協助基礎洗澡整理。",
    },
  },
};

export const defaultBusinessSettings: BusinessSettings = {
  weekdayHours: "09:00 - 21:00",
  weekendHours: "09:00 - 21:00",
  closedDates: [],
  shifts: ["早班 09:00-15:00", "晚班 15:00-21:00"],
};

export const defaultNotificationSettings: NotificationSettings = {
  bookingReminderHours: 72,
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
      addOnServices: {
        ...defaultServiceCatalog.addOnServices,
        ...data.serviceCatalog?.addOnServices,
      },
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
