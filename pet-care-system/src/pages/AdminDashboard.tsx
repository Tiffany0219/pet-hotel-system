import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Home,
  Mail,
  MessageSquare,
  PawPrint,
  Phone,
  RefreshCcw,
  Save,
  Scissors,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  History,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";
import { useAuth } from "../contexts/AuthContext";

type AdminView = "today" | "frontdesk" | "analytics" | "rooms" | "orders" | "staffing" | "settings";
type ServiceType = "accommodation" | "grooming";
type RoomType = "standard" | "deluxe" | "vip";
type GroomingService = "basic" | "styling" | "spa";

type CareLog = {
  id: string;
  orderId: string;
  authorName: string;
  logType: string;
  message: string;
  photoUrl?: string;
  visibleToCustomer: boolean;
  createdAt: string;
};

type AuditLog = {
  id: string;
  orderId?: string | null;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
};

type Order = {
  id: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  petName?: string;
  pet?: {
    id: string;
    name: string;
    species: string;
    breed: string;
    age: number;
    weight: number;
    gender: string;
    notes: string;
    imageUrl?: string;
  } | null;
  serviceType: ServiceType;
  roomType?: RoomType | null;
  groomingService?: GroomingService | null;
  startDate: string;
  endDate?: string | null;
  assignedSpot?: string | null;
  scheduledTime?: string | null;
  assignmentNote?: string;
  careLogs?: CareLog[];
  auditLogs?: AuditLog[];
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount?: number;
  balanceDue?: number;
  receiptNo?: string;
  paidAt?: string | null;
  notes?: string;
  createdAt: string;
};

type Member = {
  id: string;
  email: string;
  name: string;
  phone: string;
  pets: NonNullable<Order["pet"]>[];
  orders: Order[];
  orderCount: number;
  petCount: number;
};

type RoomAvailability = {
  capacity: number;
  booked: number;
  remaining: number;
};

type AdminStats = {
  date: string;
  stats: {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    activeOrders: number;
    completedOrders: number;
    revenue: number;
    members: number;
    pets: number;
    unassignedOrders: number;
  };
  rooms: Record<RoomType, RoomAvailability>;
};

type AssignmentOptions = {
  roomSpots: Record<RoomType, string[]>;
  groomingStations: string[];
  groomingTimes: string[];
};

type SystemRole = "staff" | "groomer" | "caregiver" | "admin";

type SystemUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: SystemRole;
};

type StaffShift = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  workDate: string;
  shiftLabel: string;
  role: SystemRole;
  roleLabel: string;
  note: string;
  createdAt: string;
};

type Attendance = {
  id: string;
  workDate: string;
  roleLabel: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
  workedMinutes: number;
  note?: string;
};

type ServiceCatalog = {
  roomPrices: Record<RoomType, number>;
  groomingPrices: Record<GroomingService, number>;
};

type BusinessSettings = {
  weekdayHours: string;
  weekendHours: string;
  shifts: string[];
  closedDates: string[];
};

type NotificationSettings = {
  bookingReminderHours: number;
  paymentReminderHours: number;
  careLogNotifyCustomer: boolean;
  channels: string[];
  staffReminderText: string;
};

type ChartItem = {
  label: string;
  value: number;
  color: string;
  helper?: string;
};

type DashboardCharts = {
  status: ChartItem[];
  service: ChartItem[];
  payment: ChartItem[];
  roomOccupancy: ChartItem[];
  recentOrders: ChartItem[];
};

async function downloadAuthenticatedFile(path: string, filename: string) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "下載失敗");
  }

  const blob = await response.blob();
  saveBlob(blob, filename);
}

function downloadJsonFile(data: unknown, filename: string) {
  saveBlob(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    filename
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const statusOptions = ["待確認", "已確認", "進行中", "已完成", "已取消"];
const paymentStatusOptions = ["未付款", "已付訂金", "已付款"];
const paymentMethodOptions = ["未設定", "現金", "轉帳", "信用卡", "線上付款", "現場付款", "其他"];
const serviceOptions = [
  { value: "全部", label: "全部" },
  { value: "accommodation", label: "住宿" },
  { value: "grooming", label: "美容" },
];
const roomTypes: RoomType[] = ["standard", "deluxe", "vip"];

const roomNames: Record<RoomType, string> = {
  standard: "豪華單人房",
  deluxe: "舒適雙人房",
  vip: "VIP 總統套房",
};

const groomingNames: Record<GroomingService, string> = {
  basic: "基礎洗澡護理",
  styling: "造型剪毛設計",
  spa: "SPA 深層護理",
};

const systemRoleNames: Record<SystemRole, string> = {
  staff: "店務人員",
  groomer: "美容師",
  caregiver: "寵物照護師",
  admin: "系統管理員",
};

const defaultAssignmentOptions: AssignmentOptions = {
  roomSpots: {
    standard: ["S-01", "S-02", "S-03", "S-04", "S-05"],
    deluxe: ["D-01", "D-02", "D-03"],
    vip: ["V-01", "V-02"],
  },
  groomingStations: ["G-01", "G-02", "G-03"],
  groomingTimes: ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"],
};

const defaultServiceCatalog: ServiceCatalog = {
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
};

const defaultBusinessSettings: BusinessSettings = {
  weekdayHours: "09:00 - 21:00",
  weekendHours: "09:00 - 21:00",
  shifts: ["早班 09:00-15:00", "晚班 15:00-21:00"],
  closedDates: [],
};

const defaultNotificationSettings: NotificationSettings = {
  bookingReminderHours: 24,
  paymentReminderHours: 12,
  careLogNotifyCustomer: true,
  channels: ["站內通知", "Email"],
  staffReminderText: "請確認今日入住、退房、美容與待收款項目。",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<AssignmentOptions>(
    defaultAssignmentOptions
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [creatingLogId, setCreatingLogId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("today");
  const [selectedBusinessDate, setSelectedBusinessDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [serviceFilter, setServiceFilter] = useState("全部");
  const [paymentFilter, setPaymentFilter] = useState("全部");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openOrderTabs, setOpenOrderTabs] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const token = localStorage.getItem("token");
  const isSystemAdmin = user?.role === "admin";
  const staffRoleLabel = isSystemAdmin ? "系統管理員" : "店務人員";

  async function api(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "店務資料讀取失敗");
    }

    return data;
  }

  async function loadDashboard(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const [statsData, ordersData, optionsData, attendanceData] = await Promise.all([
        api("/admin/stats"),
        api("/admin/orders"),
        api("/admin/assignments/options"),
        api("/staff/attendance/today"),
      ]);

      setStats(statsData);
      setOrders(ordersData.orders || []);
      setAssignmentOptions(optionsData);
      setAttendance(attendanceData.attendance || null);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error(error);
      if (showLoading) {
        toast.error(error instanceof Error ? error.message : "店務資料讀取失敗");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeView === "settings") {
      return;
    }

    const timer = window.setInterval(() => {
      loadDashboard(false);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [activeView]);

  function openOrderDetail(orderId: string) {
    if (!orderId) return;

    setSelectedOrderId(orderId);
    setOpenOrderTabs((current) =>
      current.includes(orderId) ? current : [...current, orderId].slice(-8)
    );
  }

  function closeOrderTab(orderId: string) {
    setOpenOrderTabs((current) => {
      const next = current.filter((id) => id !== orderId);

      if (selectedOrderId === orderId) {
        setSelectedOrderId(next[next.length - 1] || null);
      }

      return next;
    });
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      setUpdatingId(orderId);

      const data = await api(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );

      const statsData = await api("/admin/stats");
      setStats(statsData);
      setLastSyncedAt(new Date());

      toast.success(`訂單 #${orderId} 已更新為 ${status}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "訂單狀態更新失敗");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateAttendance(action: "clock-in" | "clock-out") {
    try {
      setAttendanceSaving(true);
      const data = await api(`/staff/attendance/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setAttendance(data.attendance || null);
      toast.success(data.message || "打卡成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "打卡失敗");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function updateAssignment(
    orderId: string,
    payload: {
      assignedSpot: string;
      scheduledTime: string;
      assignmentNote: string;
    }
  ) {
    try {
      setAssigningId(orderId);

      const data = await api(`/admin/orders/${orderId}/assignment`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );

      const statsData = await api("/admin/stats");
      setStats(statsData);
      setLastSyncedAt(new Date());

      toast.success(`訂單 #${orderId} 的安排已更新`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "安排更新失敗");
    } finally {
      setAssigningId(null);
    }
  }

  async function updatePayment(
    orderId: string,
    payload: {
      paymentStatus: string;
      paymentMethod: string;
      paidAmount: number;
    }
  ) {
    try {
      setPayingId(orderId);

      const data = await api(`/admin/orders/${orderId}/payment`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );

      const statsData = await api("/admin/stats");
      setStats(statsData);
      setLastSyncedAt(new Date());

      toast.success(`訂單 #${orderId} 的付款資料已更新`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "付款資料更新失敗");
    } finally {
      setPayingId(null);
    }
  }

  async function updateAssignmentOptions(nextOptions: AssignmentOptions) {
    try {
      setSavingSettings(true);

      const data = await api("/admin/assignments/options", {
        method: "PATCH",
        body: JSON.stringify(nextOptions),
      });

      setAssignmentOptions({
        roomSpots: data.roomSpots,
        groomingStations: data.groomingStations,
        groomingTimes: data.groomingTimes,
      });

      const statsData = await api("/admin/stats");
      setStats(statsData);
      setLastSyncedAt(new Date());

      toast.success("營運設定已更新");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "營運設定更新失敗");
    } finally {
      setSavingSettings(false);
    }
  }

  async function createCareLog(
    orderId: string,
    payload: {
      logType: string;
      message: string;
      photoUrl?: string;
      visibleToCustomer: boolean;
    }
  ) {
    try {
      setCreatingLogId(orderId);

      const data = await api(`/admin/orders/${orderId}/care-logs`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );
      setLastSyncedAt(new Date());

      toast.success("照護紀錄已新增");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "照護紀錄新增失敗");
    } finally {
      setCreatingLogId(null);
    }
  }

  async function handleOrderAction(
    orderId: string,
    path: string,
    successMessage: string,
    payload?: Record<string, unknown>
  ) {
    try {
      setUpdatingId(orderId);
      const data = await api(`/admin/orders/${orderId}/${path}`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );
      setLastSyncedAt(new Date());
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleOrderPatchAction(
    orderId: string,
    path: string,
    successMessage: string
  ) {
    try {
      setUpdatingId(orderId);
      const data = await api(`/admin/orders/${orderId}/${path}`, {
        method: "PATCH",
      });

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );
      const statsData = await api("/admin/stats");
      setStats(statsData);
      setLastSyncedAt(new Date());
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失敗");
    } finally {
      setUpdatingId(null);
    }
  }

  const todayDate = stats?.date || formatDateKey(new Date());
  const businessDate = selectedBusinessDate || todayDate;

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  const roomTotals = useMemo(() => {
    const rooms = stats?.rooms;

    if (!rooms) {
      return { capacity: 0, booked: 0, remaining: 0, occupancy: 0 };
    }

    const values = Object.values(rooms);
    const capacity = values.reduce((sum, room) => sum + room.capacity, 0);
    const booked = values.reduce((sum, room) => sum + room.booked, 0);
    const remaining = values.reduce((sum, room) => sum + room.remaining, 0);

    return {
      capacity,
      booked,
      remaining,
      occupancy: capacity ? Math.round((booked / capacity) * 100) : 0,
    };
  }, [stats?.rooms]);

  const pendingOrders = useMemo(
    () => sortedOrders.filter((order) => order.status === "待確認"),
    [sortedOrders]
  );

  const inProgressOrders = useMemo(
    () => sortedOrders.filter((order) => order.status === "進行中"),
    [sortedOrders]
  );

  const todayCheckIns = useMemo(
    () =>
      sortedOrders.filter(
        (order) =>
          order.serviceType === "accommodation" &&
          order.status !== "已取消" &&
          order.startDate === businessDate
      ),
    [businessDate, sortedOrders]
  );

  const todayCheckOuts = useMemo(
    () =>
      sortedOrders.filter(
        (order) =>
          order.serviceType === "accommodation" &&
          order.status !== "已取消" &&
          order.endDate === businessDate
      ),
    [businessDate, sortedOrders]
  );

  const todayGrooming = useMemo(
    () =>
      sortedOrders.filter(
        (order) =>
          order.serviceType === "grooming" &&
          order.status !== "已取消" &&
          order.startDate === businessDate
      ),
    [businessDate, sortedOrders]
  );

  const unpaidOrders = useMemo(
    () =>
      sortedOrders.filter(
        (order) =>
          order.status !== "已取消" &&
          order.paymentStatus !== "已付款" &&
          ["待確認", "已確認", "進行中"].includes(order.status)
      ),
    [sortedOrders]
  );

  const unassignedOrders = useMemo(
    () =>
      sortedOrders.filter(
        (order) =>
          order.status !== "已取消" &&
          order.status !== "已完成" &&
          !isOrderAssigned(order)
      ),
    [sortedOrders]
  );

  const roomGuestsByType = useMemo(() => {
    return roomTypes.reduce<Record<RoomType, Order[]>>(
      (result, roomType) => {
        result[roomType] = sortedOrders.filter(
          (order) =>
            order.roomType === roomType &&
            isStayingOnDate(order, businessDate) &&
            Boolean(order.assignedSpot)
        );
        return result;
      },
      { standard: [], deluxe: [], vip: [] }
    );
  }, [businessDate, sortedOrders]);

  const workflowColumns = [
    {
      id: "pending",
      title: "待確認",
      subtitle: "需要聯繫客戶確認",
      orders: pendingOrders,
      tone: "rose" as const,
    },
    {
      id: "checkin",
      title: "今日入住",
      subtitle: "住宿報到與房間安排",
      orders: todayCheckIns,
      tone: "blue" as const,
    },
    {
      id: "checkout",
      title: "今日退房",
      subtitle: "交接與結帳確認",
      orders: todayCheckOuts,
      tone: "gold" as const,
    },
    {
      id: "grooming",
      title: "今日美容",
      subtitle: "洗澡、修剪與 SPA",
      orders: todayGrooming,
      tone: "green" as const,
    },
    {
      id: "progress",
      title: "進行中",
      subtitle: "目前服務中的訂單",
      orders: inProgressOrders,
      tone: "brown" as const,
    },
  ];

  const statusCounts = useMemo(() => {
    return statusOptions.reduce<Record<string, number>>((counts, status) => {
      counts[status] = sortedOrders.filter(
        (order) => order.status === status
      ).length;
      return counts;
    }, {});
  }, [sortedOrders]);

  const serviceCounts = useMemo(() => {
    return {
      accommodation: sortedOrders.filter(
        (order) => order.serviceType === "accommodation"
      ).length,
      grooming: sortedOrders.filter((order) => order.serviceType === "grooming")
        .length,
    };
  }, [sortedOrders]);

  const reportMetrics = useMemo(() => {
    const validOrders = sortedOrders.filter((order) => order.status !== "已取消");
    const canceledOrders = sortedOrders.filter((order) => order.status === "已取消");
    const roomUsage = roomTypes.map((roomType) => ({
      label: roomNames[roomType],
      count: validOrders.filter((order) => order.roomType === roomType).length,
    }));
    const groomingUsage = (["basic", "styling", "spa"] as GroomingService[]).map(
      (service) => ({
        label: groomingNames[service],
        count: validOrders.filter((order) => order.groomingService === service)
          .length,
      })
    );
    const popular = [...roomUsage, ...groomingUsage].sort(
      (a, b) => b.count - a.count
    )[0];

    return {
      cancelRate: sortedOrders.length
        ? Math.round((canceledOrders.length / sortedOrders.length) * 100)
        : 0,
      popularService: popular?.count ? popular.label : "尚無資料",
      roomUsage,
      groomingUsage,
      groomingWorkload: validOrders.filter((order) => order.serviceType === "grooming").length,
      careWorkload: validOrders.filter((order) => order.serviceType === "accommodation").length,
    };
  }, [sortedOrders]);

  const dashboardCharts = useMemo<DashboardCharts>(() => {
    const statusColors: Record<string, string> = {
      待確認: "#b87868",
      已確認: "#6f9fc2",
      進行中: "#6b3a2a",
      已完成: "#5f8a5f",
      已取消: "#b85c68",
    };
    const baseDate = businessDate ? parseDateKey(businessDate) : new Date();

    return {
      status: statusOptions.map((status) => ({
        label: status,
        value: statusCounts[status] || 0,
        color: statusColors[status] || "#9ca3af",
      })),
      service: [
        {
          label: "住宿",
          value: serviceCounts.accommodation,
          color: "#6b3a2a",
        },
        {
          label: "美容",
          value: serviceCounts.grooming,
          color: "#b87868",
        },
      ],
      payment: paymentStatusOptions.map((status, index) => ({
        label: status,
        value: sortedOrders.filter((order) => order.paymentStatus === status).length,
        color: ["#b87868", "#c8a15f", "#5f8a5f"][index] || "#9ca3af",
      })),
      roomOccupancy: roomTypes.map((roomType) => {
        const room = stats?.rooms[roomType];
        const value = room?.capacity
          ? Math.round((room.booked / room.capacity) * 100)
          : 0;

        return {
          label: roomNames[roomType],
          value,
          color: value >= 80 ? "#b85c68" : value >= 50 ? "#c8a15f" : "#5f8a5f",
          helper: `${room?.booked || 0} / ${room?.capacity || 0}`,
        };
      }),
      recentOrders: Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - (6 - index));
        const dateKey = formatDateKey(date);

        return {
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          value: sortedOrders.filter((order) => order.startDate === dateKey).length,
          color: "#6f9fc2",
          helper: dateKey,
        };
      }),
    };
  }, [businessDate, serviceCounts, sortedOrders, stats?.rooms, statusCounts]);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return sortedOrders.filter((order) => {
      const statusMatched =
        statusFilter === "全部" || order.status === statusFilter;
      const serviceMatched =
        serviceFilter === "全部" || order.serviceType === serviceFilter;
      const paymentMatched =
        paymentFilter === "全部" || order.paymentStatus === paymentFilter;
      const dateMatched =
        (!dateFromFilter || order.startDate >= dateFromFilter) &&
        (!dateToFilter || order.startDate <= dateToFilter);
      const queryMatched =
        !keyword ||
        [
          order.id,
          order.userName,
          order.userEmail,
          order.userPhone,
          order.petName,
          serviceName(order),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return statusMatched && serviceMatched && paymentMatched && dateMatched && queryMatched;
    });
  }, [dateFromFilter, dateToFilter, paymentFilter, query, serviceFilter, sortedOrders, statusFilter]);

  const hasOrderFilters =
    query.trim() !== "" ||
    statusFilter !== "全部" ||
    serviceFilter !== "全部" ||
    paymentFilter !== "全部" ||
    dateFromFilter !== "" ||
    dateToFilter !== "";

  const visibleOrderResults = hasOrderFilters
    ? filteredOrders
    : sortedOrders.slice(0, 10);

  const selectedOrder = useMemo(() => {
    return sortedOrders.find((order) => order.id === selectedOrderId) || null;
  }, [selectedOrderId, sortedOrders]);
  const openOrderTabItems = useMemo(() => {
    return openOrderTabs
      .map((id) => sortedOrders.find((order) => order.id === id))
      .filter(Boolean) as Order[];
  }, [openOrderTabs, sortedOrders]);

  const navItems = [
    {
      id: "today" as const,
      label: "營運總覽",
      group: "分析",
      icon: <ClipboardList className="h-4 w-4" />,
      count:
        pendingOrders.length +
        todayCheckIns.length +
        todayCheckOuts.length +
        todayGrooming.length +
        inProgressOrders.length +
        unassignedOrders.length,
    },
    {
      id: "frontdesk" as const,
      label: "櫃檯工作台",
      group: "營運",
      icon: <Phone className="h-4 w-4" />,
      count:
        todayCheckIns.length +
        todayCheckOuts.length +
        pendingOrders.length +
        unpaidOrders.length,
    },
    {
      id: "analytics" as const,
      label: "經營分析",
      group: "分析",
      icon: <BarChart3 className="h-4 w-4" />,
      count: stats?.stats.totalOrders || sortedOrders.length,
    },
    {
      id: "rooms" as const,
      label: "預約與房況",
      group: "營運",
      icon: <Home className="h-4 w-4" />,
      count: roomTotals.booked,
    },
    {
      id: "orders" as const,
      label: "訂單查詢",
      group: "營運",
      icon: <Search className="h-4 w-4" />,
      count: sortedOrders.length,
    },
    {
      id: "staffing" as const,
      label: "員工排班",
      group: "營運",
      icon: <Clock className="h-4 w-4" />,
      count: 0,
    },
    ...(isSystemAdmin
      ? [
          {
            id: "settings" as const,
            label: "系統設定",
            group: "商品服務",
            icon: <Settings className="h-4 w-4" />,
            count:
              Object.values(assignmentOptions.roomSpots).reduce(
                (sum, spots) => sum + spots.length,
                0
              ) + assignmentOptions.groomingStations.length,
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="rounded-lg bg-white border border-gray-200 px-8 py-6 shadow-sm">
          <p className="text-[#3d1a0d]">正在讀取店務資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-gray-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="sticky top-0 p-4">
          <div className="rounded-lg border border-gray-200 bg-[#fbfcfd] px-4 py-3">
            <p className="text-xs text-gray-400">PET CARE SYSTEM</p>
            <p className="mt-1 text-sm text-[#202124]">櫃檯店務後台</p>
          </div>

          <nav className="mt-5 space-y-5">
            {["分析", "營運", "商品服務"].map((group) => {
              const items = navItems.filter((item) => item.group === group);
              if (items.length === 0) return null;

              return (
                <div key={group}>
                  <p className="mb-2 px-2 text-xs text-gray-400">{group}</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <SidebarNavItem
                        key={item.id}
                        active={activeView === item.id}
                        icon={item.icon}
                        label={item.label}
                        count={item.count}
                        onClick={() => setActiveView(item.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0">
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-[#edf6fc] px-2.5 py-1 text-xs text-[#3f789f]">
                    {staffRoleLabel}
                  </span>
                  <span className="text-sm text-gray-500">
                    營業日 {businessDate || "-"}
                  </span>
                </div>
                <h1 className="text-2xl text-[#202124]">店務營運中心</h1>
              </div>

              <div className="flex items-center gap-3">
                <AttendancePunch
                  attendance={attendance}
                  saving={attendanceSaving}
                  onClockIn={() => updateAttendance("clock-in")}
                  onClockOut={() => updateAttendance("clock-out")}
                />
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                  aria-label="通知"
                >
                  <Bell className="h-5 w-5" />
                </button>
                <button
                  onClick={() => loadDashboard()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b] transition-all"
                >
                  <RefreshCcw className="w-4 h-4" />
                  重新整理
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              自動同步中
              {lastSyncedAt ? `，最後更新 ${lastSyncedAt.toLocaleTimeString()}` : ""}
            </p>
          </div>
        </section>

        <main className="mx-auto max-w-7xl px-4 py-6">
        {activeView === "today" && (
          <TodayWorkspace
            businessDate={businessDate}
            todayDate={todayDate}
            stats={stats}
            workflowColumns={workflowColumns}
            unassignedOrders={unassignedOrders}
            unpaidOrders={unpaidOrders}
            reportMetrics={reportMetrics}
            updatingId={updatingId}
            onBusinessDateChange={setSelectedBusinessDate}
            onSelectOrder={openOrderDetail}
            onUpdateStatus={updateStatus}
          />
        )}

        {activeView === "frontdesk" && (
          <FrontDeskWorkspace
            api={api}
            businessDate={businessDate}
            orders={sortedOrders}
            todayCheckIns={todayCheckIns}
            todayCheckOuts={todayCheckOuts}
            pendingOrders={pendingOrders}
            unpaidOrders={unpaidOrders}
            unassignedOrders={unassignedOrders}
            assignmentOptions={assignmentOptions}
            updatingId={updatingId}
            onSelectOrder={openOrderDetail}
            onReload={() => loadDashboard(false)}
            onCheckIn={(id) => handleOrderPatchAction(id, "check-in", "入住已辦理")}
            onCheckOut={(id) => handleOrderPatchAction(id, "check-out", "退房已辦理")}
            onContactLog={(id, payload) =>
              handleOrderAction(id, "contact-logs", "聯絡紀錄已新增", payload)
            }
            onHandoverNote={(id, payload) =>
              handleOrderAction(id, "handover-notes", "交班備註已新增", payload)
            }
          />
        )}

        {activeView === "analytics" && (
          <AnalyticsWorkspace
            stats={stats}
            sortedOrders={sortedOrders}
            serviceCounts={serviceCounts}
            reportMetrics={reportMetrics}
            dashboardCharts={dashboardCharts}
          />
        )}

        {activeView === "rooms" && (
          <RoomManagement
            stats={stats}
            businessDate={businessDate}
            roomGuestsByType={roomGuestsByType}
            todayCheckIns={todayCheckIns}
            todayCheckOuts={todayCheckOuts}
            assignmentOptions={assignmentOptions}
            onSelectOrder={openOrderDetail}
          />
        )}

        {activeView === "orders" && (
          <OrderSearchPanel
            query={query}
            statusFilter={statusFilter}
            serviceFilter={serviceFilter}
            paymentFilter={paymentFilter}
            dateFromFilter={dateFromFilter}
            dateToFilter={dateToFilter}
            visibleOrders={visibleOrderResults}
            totalOrders={sortedOrders.length}
            filteredCount={filteredOrders.length}
            hasFilters={hasOrderFilters}
            updatingId={updatingId}
            onQueryChange={setQuery}
            onStatusFilterChange={setStatusFilter}
            onServiceFilterChange={setServiceFilter}
            onPaymentFilterChange={setPaymentFilter}
            onDateFromFilterChange={setDateFromFilter}
            onDateToFilterChange={setDateToFilter}
            onSelectOrder={openOrderDetail}
            onUpdateStatus={updateStatus}
          />
        )}

        {activeView === "staffing" && (
          <StaffingWorkspace
            api={api}
            isSystemAdmin={isSystemAdmin}
            businessDate={businessDate}
          />
        )}

        {activeView === "settings" && isSystemAdmin && (
          <SettingsPanel
            api={api}
            options={assignmentOptions}
            saving={savingSettings}
            onSave={updateAssignmentOptions}
          />
        )}
        </main>
      </div>

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          tabs={openOrderTabItems}
          updatingId={updatingId}
          assigningId={assigningId}
          payingId={payingId}
          creatingLogId={creatingLogId}
          assignmentOptions={assignmentOptions}
          onUpdateStatus={updateStatus}
          onUpdateAssignment={updateAssignment}
          onUpdatePayment={updatePayment}
          onCreateCareLog={createCareLog}
          onSelectTab={openOrderDetail}
          onCloseTab={closeOrderTab}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

function FrontDeskWorkspace({
  api,
  businessDate,
  orders,
  todayCheckIns,
  todayCheckOuts,
  pendingOrders,
  unpaidOrders,
  unassignedOrders,
  assignmentOptions,
  updatingId,
  onSelectOrder,
  onReload,
  onCheckIn,
  onCheckOut,
  onContactLog,
  onHandoverNote,
}: {
  api: (path: string, options?: RequestInit) => Promise<any>;
  businessDate: string;
  orders: Order[];
  todayCheckIns: Order[];
  todayCheckOuts: Order[];
  pendingOrders: Order[];
  unpaidOrders: Order[];
  unassignedOrders: Order[];
  assignmentOptions: AssignmentOptions;
  updatingId: string | null;
  onSelectOrder: (id: string) => void;
  onReload: () => void;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onContactLog: (
    id: string,
    payload: { channel: string; result: string; note: string }
  ) => void;
  onHandoverNote: (id: string, payload: { note: string }) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [bookingMemberQuery, setBookingMemberQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string>("");
  const [contact, setContact] = useState({
    channel: "電話",
    result: "已聯絡",
    note: "",
  });
  const [handoverNote, setHandoverNote] = useState("");
  const [booking, setBooking] = useState({
    memberMode: "existing",
    memberName: "",
    memberPhone: "",
    memberEmail: "",
    petName: "",
    species: "狗",
    breed: "",
    age: "1",
    weight: "5",
    gender: "未提供",
    petNotes: "",
    serviceType: "accommodation" as ServiceType,
    roomType: "standard" as RoomType,
    groomingService: "basic" as GroomingService,
    startDate: businessDate,
    endDate: businessDate,
    scheduledTime: assignmentOptions.groomingTimes[0] || "09:00",
    assignedSpot: "",
    notes: "",
  });

  useEffect(() => {
    setBooking((current) => ({
      ...current,
      startDate: current.startDate || businessDate,
      endDate: current.endDate || businessDate,
    }));
  }, [businessDate]);

  useEffect(() => {
    async function loadMembers() {
      try {
        setLoadingMembers(true);
        const data = await api("/admin/members");
        setMembers(data.members || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "會員資料讀取失敗");
      } finally {
        setLoadingMembers(false);
      }
    }

    loadMembers();
  }, []);

  const usableMembers = members.filter(
    (member) => !(member.name.trim() === "123" && member.phone.trim() === "123")
  );
  const selectedMember = usableMembers.find((member) => member.id === selectedMemberId);
  const memberSearchResults = usableMembers
    .filter((member) => {
      const keyword = memberQuery.trim().toLowerCase();
      if (!keyword) return true;

      return [
        member.name,
        member.phone,
        member.email,
        member.pets.map((pet) => pet.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    })
    .slice(0, 8);
  const bookingMemberMatches = usableMembers
    .filter((member) => {
      const keyword = bookingMemberQuery.trim().toLowerCase();
      if (!keyword) return true;

      return [
        member.name,
        member.phone,
        member.email,
        member.pets.map((pet) => pet.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    })
    .slice(0, 6);
  const deskOrders = [
    ...todayCheckIns,
    ...todayCheckOuts,
    ...pendingOrders,
    ...unpaidOrders,
    ...unassignedOrders,
  ].filter((order, index, list) => list.findIndex((item) => item.id === order.id) === index);
  const activeOrder =
    orders.find((order) => order.id === activeOrderId) || deskOrders[0] || null;
  const recentAuditLogs = (activeOrder?.auditLogs || []).slice(0, 5);
  const todayGrooming = orders.filter(
    (order) =>
      order.serviceType === "grooming" &&
      order.startDate === businessDate &&
      order.status !== "已取消"
  );
  const activeDeskOrders = orders.filter(
    (order) => order.status === "進行中"
  );
  const timelineOrders = [
    ...todayCheckIns,
    ...todayCheckOuts,
    ...todayGrooming,
    ...pendingOrders.slice(0, 4),
  ]
    .filter((order, index, list) => list.findIndex((item) => item.id === order.id) === index)
    .sort((a, b) => {
      const left = a.scheduledTime || (a.serviceType === "accommodation" ? "12:00" : "99:99");
      const right = b.scheduledTime || (b.serviceType === "accommodation" ? "12:00" : "99:99");
      return left.localeCompare(right);
    })
    .slice(0, 8);
  const deskTaskGroups = [
    {
      title: "待確認預約",
      caption: "先聯絡家長確認時間與需求",
      orders: pendingOrders,
      tone: "rose" as const,
    },
    {
      title: "待收款",
      caption: "確認訂金、尾款與付款方式",
      orders: unpaidOrders,
      tone: "gold" as const,
    },
    {
      title: "未安排位置",
      caption: "補上房位、美容台或時段",
      orders: unassignedOrders,
      tone: "blue" as const,
    },
  ];

  const roomSpotOptions =
    assignmentOptions.roomSpots[booking.roomType] || [];
  const groomingSpotOptions = assignmentOptions.groomingStations;
  const pickOrder = (order: Order) => {
    setActiveOrderId(order.id);
    onSelectOrder(order.id);
  };

  async function createFrontDeskBooking() {
    if (booking.memberMode === "existing" && (!selectedMemberId || !selectedPetId)) {
      toast.error("請先選擇會員與寵物");
      return;
    }

    if (booking.memberMode === "new" && (!booking.memberName || !booking.memberPhone || !booking.petName)) {
      toast.error("請填寫新客姓名、電話與寵物姓名");
      return;
    }

    try {
      setSavingBooking(true);
      await api("/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: booking.memberMode === "existing" ? selectedMemberId : undefined,
          petId: booking.memberMode === "existing" ? selectedPetId : undefined,
          member:
            booking.memberMode === "new"
              ? {
                  name: booking.memberName,
                  phone: booking.memberPhone,
                  email: booking.memberEmail,
                }
              : undefined,
          pet:
            booking.memberMode === "new"
              ? {
                  name: booking.petName,
                  species: booking.species,
                  breed: booking.breed,
                  age: Number(booking.age),
                  weight: Number(booking.weight),
                  gender: booking.gender,
                  notes: booking.petNotes,
                }
              : undefined,
          serviceType: booking.serviceType,
          roomType: booking.serviceType === "accommodation" ? booking.roomType : undefined,
          groomingService:
            booking.serviceType === "grooming" ? booking.groomingService : undefined,
          startDate: booking.startDate,
          endDate: booking.serviceType === "accommodation" ? booking.endDate : undefined,
          scheduledTime:
            booking.serviceType === "grooming" ? booking.scheduledTime : undefined,
          assignedSpot: booking.assignedSpot,
          notes: booking.notes,
          status: "已確認",
        }),
      });
      toast.success("櫃檯預約已建立");
      setSelectedPetId("");
      setBooking((current) => ({
        ...current,
        memberName: "",
        memberPhone: "",
        memberEmail: "",
        petName: "",
        breed: "",
        petNotes: "",
        assignedSpot: "",
        notes: "",
      }));
      onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "預約建立失敗");
    } finally {
      setSavingBooking(false);
    }
  }

  function saveContact() {
    if (!activeOrder || !contact.note.trim()) {
      toast.error("請先選擇訂單並輸入聯絡內容");
      return;
    }

    onContactLog(activeOrder.id, contact);
    setContact((current) => ({ ...current, note: "" }));
  }

  function saveHandover() {
    if (!activeOrder || !handoverNote.trim()) {
      toast.error("請先選擇訂單並輸入交班備註");
      return;
    }

    onHandoverNote(activeOrder.id, { note: handoverNote });
    setHandoverNote("");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-[#202124] shadow-sm">
        <div className="grid gap-5 p-5 text-white lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs text-white/55">FRONT DESK</p>
            <h2 className="mt-2 text-2xl">櫃檯工作台</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
              現場辦理入住退房、快速建立預約、查詢會員與記錄聯絡事項。
            </p>
          </div>
          <div className="rounded-lg bg-white/10 px-4 py-3 text-sm">
            <p className="text-white/60">營業日</p>
            <p className="mt-1 text-lg">{businessDate || "-"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<Home className="h-5 w-5" />} label="今日入住" value={todayCheckIns.length} helper="可辦理入住" tone="blue" />
        <MetricCard icon={<CheckCircle className="h-5 w-5" />} label="今日退房" value={todayCheckOuts.length} helper="需確認尾款" tone="green" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="待確認" value={pendingOrders.length} helper="需聯絡客戶" tone="rose" />
        <MetricCard icon={<CreditCard className="h-5 w-5" />} label="待收款" value={unpaidOrders.length} helper="訂金或尾款" tone="gold" />
        <MetricCard icon={<PawPrint className="h-5 w-5" />} label="未安排" value={unassignedOrders.length} helper="房位或美容台" tone="blue" />
      </section>

      <FrontDeskTaskBoard
        timelineOrders={timelineOrders}
        taskGroups={deskTaskGroups}
        activeOrders={activeDeskOrders}
        todayGrooming={todayGrooming}
        onPickOrder={pickOrder}
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <DeskQueue
            title="今日入住"
            orders={todayCheckIns}
            emptyText="今天沒有待入住住宿"
            updatingId={updatingId}
            actionLabel="辦理入住"
            onAction={onCheckIn}
            onPick={pickOrder}
          />
          <DeskQueue
            title="今日退房"
            orders={todayCheckOuts}
            emptyText="今天沒有待退房住宿"
            updatingId={updatingId}
            actionLabel="辦理退房"
            onAction={onCheckOut}
            onPick={pickOrder}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-[#6f9fc2]" />
                <h3 className="text-lg text-[#202124]">聯絡與交班</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                追蹤客戶通知與班別交接事項。
              </p>
            </div>
            <div className="p-4">
              {activeOrder ? (
                <>
                <button
                  type="button"
                  onClick={() => onSelectOrder(activeOrder.id)}
                  className="w-full rounded-lg border border-gray-200 bg-[#f7f8fa] p-3 text-left hover:bg-[#eef3f6]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[#202124]">
                      #{activeOrder.id} {activeOrder.petName}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge(activeOrder.status)}`}>
                      {activeOrder.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {activeOrder.userName} / {serviceName(activeOrder)} / {assignmentSummary(activeOrder)}
                  </p>
                </button>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <select
                    value={contact.channel}
                    onChange={(event) => setContact((current) => ({ ...current, channel: event.target.value }))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                  >
                    <option>電話</option>
                    <option>LINE</option>
                    <option>Email</option>
                    <option>現場</option>
                  </select>
                  <select
                    value={contact.result}
                    onChange={(event) => setContact((current) => ({ ...current, result: event.target.value }))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                  >
                    <option>已聯絡</option>
                    <option>未接</option>
                    <option>已留言</option>
                    <option>客戶回覆</option>
                  </select>
                </div>
                <textarea
                  value={contact.note}
                  onChange={(event) => setContact((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                  placeholder="例如：已電話提醒明天入住，家長表示 18:00 抵達。"
                />
                <button
                  type="button"
                  onClick={saveContact}
                  className="mt-2 w-full rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b]"
                >
                  新增聯絡紀錄
                </button>
                <textarea
                  value={handoverNote}
                  onChange={(event) => setHandoverNote(event.target.value)}
                  rows={2}
                  className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                  placeholder="交班備註：晚班需要追蹤的事情"
                />
                <button
                  type="button"
                  onClick={saveHandover}
                  className="mt-2 w-full rounded-lg border border-[#202124] px-4 py-2.5 text-sm text-[#202124] hover:bg-gray-50"
                >
                  新增交班備註
                </button>
                  <div className="mt-4 space-y-2">
                    {recentAuditLogs.length === 0 ? (
                      <EmptyNote text="目前沒有聯絡或交班紀錄" />
                    ) : (
                      recentAuditLogs.map((log) => (
                        <div key={log.id} className="rounded-lg bg-[#f7f8fa] p-3">
                          <p className="text-xs text-gray-500">
                            {log.action} / {new Date(log.createdAt).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm text-gray-700">{log.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <EmptyNote text="請先從左側選擇一筆訂單" />
              )}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#6f9fc2]" />
              <h3 className="text-lg text-[#202124]">會員快速查詢</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              搜尋會員後可直接帶入右側快速預約。
            </p>
          </div>
          <div className="p-4">
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
              placeholder="輸入姓名、電話、Email 或寵物名"
            />
            <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
            {loadingMembers ? (
              <EmptyNote text="正在讀取會員..." />
            ) : memberSearchResults.length === 0 ? (
              <EmptyNote text="找不到會員資料" />
            ) : (
              memberSearchResults.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedMemberId(member.id);
                    setSelectedPetId(member.pets[0]?.id || "");
                    setBookingMemberQuery(member.name);
                    setBooking((current) => ({ ...current, memberMode: "existing" }));
                  }}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedMemberId === member.id
                      ? "border-[#6f9fc2] bg-[#f7fbff]"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#202124]">{member.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{member.phone}</p>
                    </div>
                    <span className="rounded-full bg-[#f7f8fa] px-2.5 py-1 text-xs text-gray-500">
                      {member.orderCount} 筆
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {member.pets.map((pet) => pet.name).join("、") || "尚無寵物"}
                  </p>
                </button>
              ))
            )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
            <div>
              <h3 className="text-lg text-[#202124]">櫃檯快速預約</h3>
              <p className="mt-1 text-sm text-gray-500">支援電話預約、現場新客與既有會員代訂。</p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#6f9fc2]" />
          </div>

          <div className="p-4">
          <div className="mb-4 flex rounded-lg bg-[#f7f8fa] p-1">
            {[
              { value: "existing", label: "既有會員" },
              { value: "new", label: "現場新客" },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setBooking((current) => ({ ...current, memberMode: mode.value }))}
                className={`flex-1 rounded-md px-3 py-2 text-sm ${
                  booking.memberMode === mode.value
                    ? "bg-white text-[#202124] shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {booking.memberMode === "existing" ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <label className="block">
                  <span className="text-xs text-gray-500">搜尋會員姓名 / 電話</span>
                  <input
                    value={bookingMemberQuery}
                    onChange={(event) => setBookingMemberQuery(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
                    placeholder="例如：王小美、0912 或 momo"
                  />
                </label>
                <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-lg border border-gray-200 bg-[#fbfcfd] p-2">
                  {bookingMemberMatches.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-gray-500">找不到符合的會員</p>
                  ) : (
                    bookingMemberMatches.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setSelectedPetId(member.pets[0]?.id || "");
                          setBookingMemberQuery(member.name);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                          selectedMemberId === member.id
                            ? "bg-[#edf6fc] text-[#202124]"
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <span className="block">{member.name}</span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {member.phone} ・ {member.pets.map((pet) => pet.name).join("、") || "尚無寵物"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <SelectField
                  label="寵物"
                  value={selectedPetId}
                  onChange={setSelectedPetId}
                  options={(selectedMember?.pets || []).map((pet) => ({ value: pet.id, label: `${pet.name} / ${pet.species}` }))}
                />
                {selectedMember && (
                  <div className="rounded-lg bg-[#f7f8fa] p-3">
                    <p className="text-sm text-[#202124]">{selectedMember.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedMember.phone} / 歷史訂單 {selectedMember.orderCount}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <SmallInput label="姓名" value={booking.memberName} onChange={(value) => setBooking((current) => ({ ...current, memberName: value }))} />
              <SmallInput label="電話" value={booking.memberPhone} onChange={(value) => setBooking((current) => ({ ...current, memberPhone: value }))} />
              <SmallInput label="Email（可空白）" value={booking.memberEmail} onChange={(value) => setBooking((current) => ({ ...current, memberEmail: value }))} />
              <SmallInput label="寵物姓名" value={booking.petName} onChange={(value) => setBooking((current) => ({ ...current, petName: value }))} />
              <SelectField label="種類" value={booking.species} onChange={(value) => setBooking((current) => ({ ...current, species: value }))} options={[{ value: "狗", label: "狗" }, { value: "貓", label: "貓" }, { value: "其他", label: "其他" }]} />
              <SmallInput label="品種" value={booking.breed} onChange={(value) => setBooking((current) => ({ ...current, breed: value }))} />
              <SmallInput label="年齡" value={booking.age} onChange={(value) => setBooking((current) => ({ ...current, age: value }))} />
              <SmallInput label="體重" value={booking.weight} onChange={(value) => setBooking((current) => ({ ...current, weight: value }))} />
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SelectField
              label="服務類型"
              value={booking.serviceType}
              onChange={(value) => setBooking((current) => ({ ...current, serviceType: value as ServiceType, assignedSpot: "" }))}
              options={[
                { value: "accommodation", label: "住宿" },
                { value: "grooming", label: "美容" },
              ]}
            />
            {booking.serviceType === "accommodation" ? (
              <SelectField
                label="房型"
                value={booking.roomType}
                onChange={(value) => setBooking((current) => ({ ...current, roomType: value as RoomType, assignedSpot: "" }))}
                options={roomTypes.map((roomType) => ({ value: roomType, label: roomNames[roomType] }))}
              />
            ) : (
              <SelectField
                label="美容項目"
                value={booking.groomingService}
                onChange={(value) => setBooking((current) => ({ ...current, groomingService: value as GroomingService }))}
                options={(["basic", "styling", "spa"] as GroomingService[]).map((service) => ({ value: service, label: groomingNames[service] }))}
              />
            )}
            <SmallInput type="date" label="開始日期" value={booking.startDate} onChange={(value) => setBooking((current) => ({ ...current, startDate: value }))} />
            {booking.serviceType === "accommodation" ? (
              <SmallInput type="date" label="退房日期" value={booking.endDate} onChange={(value) => setBooking((current) => ({ ...current, endDate: value }))} />
            ) : (
              <SelectField label="美容時段" value={booking.scheduledTime} onChange={(value) => setBooking((current) => ({ ...current, scheduledTime: value }))} options={assignmentOptions.groomingTimes.map((time) => ({ value: time, label: time }))} />
            )}
            <SelectField
              label={booking.serviceType === "accommodation" ? "房位（選填）" : "美容台（選填）"}
              value={booking.assignedSpot}
              onChange={(value) => setBooking((current) => ({ ...current, assignedSpot: value }))}
              options={[
                { value: "", label: "稍後安排" },
                ...(booking.serviceType === "accommodation" ? roomSpotOptions : groomingSpotOptions).map((spot) => ({ value: spot, label: spot })),
              ]}
            />
            <SmallInput label="預約備註" value={booking.notes} onChange={(value) => setBooking((current) => ({ ...current, notes: value }))} />
          </div>

          <button
            type="button"
            disabled={savingBooking}
            onClick={createFrontDeskBooking}
            className="mt-4 w-full rounded-lg bg-[#202124] px-4 py-3 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
          >
            {savingBooking ? "建立中..." : "建立櫃檯預約"}
          </button>
          </div>
        </section>
      </section>
    </div>
  );
}

function DeskQueue({
  title,
  orders,
  emptyText,
  updatingId,
  actionLabel,
  onAction,
  onPick,
}: {
  title: string;
  orders: Order[];
  emptyText: string;
  updatingId: string | null;
  actionLabel: string;
  onAction: (id: string) => void;
  onPick: (order: Order) => void;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        title={title}
        caption={`${orders.length} 筆待處理`}
        icon={<ClipboardList className="h-5 w-5" />}
      />
      <div className="divide-y divide-gray-100">
        {orders.length === 0 ? (
          <div className="p-4">
            <EmptyNote text={emptyText} />
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <button
                type="button"
                onClick={() => onPick(order)}
                className="text-left"
              >
                <p className="text-sm text-[#202124]">#{order.id} {order.petName || "未提供"} / {order.userName}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {serviceName(order)} / {dateRange(order)} / {assignmentSummary(order)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {paymentSummary(order)}
                </p>
              </button>
              <button
                type="button"
                disabled={updatingId === order.id}
                onClick={() => onAction(order.id)}
                className="rounded-lg bg-[#202124] px-4 py-2 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
              >
                {updatingId === order.id ? "處理中..." : actionLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function FrontDeskTaskBoard({
  timelineOrders,
  taskGroups,
  activeOrders,
  todayGrooming,
  onPickOrder,
}: {
  timelineOrders: Order[];
  taskGroups: Array<{
    title: string;
    caption: string;
    orders: Order[];
    tone: "rose" | "gold" | "blue";
  }>;
  activeOrders: Order[];
  todayGrooming: Order[];
  onPickOrder: (order: Order) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-[#202124]">櫃檯今日流程</h3>
              <p className="mt-1 text-sm text-gray-500">
                依時段整理今日入住、退房、美容與待確認項目。
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-[#6f9fc2]" />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {timelineOrders.length === 0 ? (
            <div className="p-4">
              <EmptyNote text="目前沒有今日流程項目" />
            </div>
          ) : (
            timelineOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onPickOrder(order)}
                className="grid w-full gap-3 p-4 text-left hover:bg-[#fbfcfd] sm:grid-cols-[88px_1fr_auto] sm:items-center"
              >
                <div className="rounded-lg bg-[#f7f8fa] px-3 py-2 text-center">
                  <p className="text-xs text-gray-500">時間</p>
                  <p className="mt-1 text-sm text-[#202124]">
                    {order.scheduledTime || (order.serviceType === "accommodation" ? "住宿" : "-")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#202124]">
                    #{order.id} {order.petName || "未提供"} / {order.userName || "未提供"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {serviceName(order)} / {assignmentSummary(order)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {paymentSummary(order)}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs ${statusBadge(order.status)}`}>
                  {order.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FrontDeskMiniStat
            label="進行中服務"
            value={activeOrders.length}
            helper="需追蹤照護或美容進度"
            icon={<RefreshCcw className="h-4 w-4" />}
          />
          <FrontDeskMiniStat
            label="今日美容"
            value={todayGrooming.length}
            helper="需確認時段與美容台"
            icon={<Scissors className="h-4 w-4" />}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-[#202124]">優先處理</h3>
              <p className="mt-1 text-sm text-gray-500">櫃檯交接前先清這些項目。</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-[#b87868]" />
          </div>

          <div className="space-y-3">
            {taskGroups.map((group) => (
              <div key={group.title} className="rounded-lg border border-gray-100 bg-[#fbfcfd] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#202124]">{group.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{group.caption}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${toneBadge(group.tone)}`}>
                    {group.orders.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {group.orders.length === 0 ? (
                    <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                      目前沒有項目
                    </p>
                  ) : (
                    group.orders.slice(0, 3).map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => onPickOrder(order)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left hover:bg-[#eef3f6]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-[#202124]">
                            #{order.id} {order.petName || "未提供"}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {order.userName || "未提供"} / {serviceName(order)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">查看</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FrontDeskMiniStat({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-2xl text-[#202124]">{value}</p>
          <p className="mt-2 text-xs text-gray-500">{helper}</p>
        </div>
        <div className="rounded-lg bg-[#edf6fc] p-2 text-[#3f789f]">{icon}</div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
      />
    </label>
  );
}

function TodayWorkspace({
  businessDate,
  todayDate,
  stats,
  workflowColumns,
  unassignedOrders,
  unpaidOrders,
  reportMetrics,
  updatingId,
  onBusinessDateChange,
  onSelectOrder,
  onUpdateStatus,
}: {
  businessDate: string;
  todayDate: string;
  stats: AdminStats | null;
  workflowColumns: Array<{
    id: string;
    title: string;
    subtitle: string;
    orders: Order[];
    tone: "blue" | "green" | "rose" | "gold" | "brown";
  }>;
  unassignedOrders: Order[];
  unpaidOrders: Order[];
  reportMetrics: {
    cancelRate: number;
    popularService: string;
    roomUsage: { label: string; count: number }[];
    groomingUsage: { label: string; count: number }[];
    groomingWorkload: number;
    careWorkload: number;
  };
  updatingId: string | null;
  onBusinessDateChange: (date: string) => void;
  onSelectOrder: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const dailyWorkflowColumns = workflowColumns.map((column) => ({
    ...column,
    orders: column.orders.filter((order) => isOrderRelevantToDate(order, businessDate)),
  }));
  const todayUnassignedOrders = unassignedOrders.filter((order) =>
    isOrderRelevantToDate(order, businessDate)
  );
  const todayUnpaidOrders = unpaidOrders.filter((order) =>
    isOrderRelevantToDate(order, businessDate)
  );
  const todayOrders = dailyWorkflowColumns.flatMap((column) => column.orders);
  const todaySchedule = [...todayOrders]
    .filter((order, index, self) => self.findIndex((item) => item.id === order.id) === index)
    .sort((a, b) => {
      const left = a.scheduledTime || (a.serviceType === "accommodation" ? "12:00" : "99:99");
      const right = b.scheduledTime || (b.serviceType === "accommodation" ? "12:00" : "99:99");
      return left.localeCompare(right);
    })
    .slice(0, 6);
  const dailyOrderCount = todayOrders.filter(
    (order, index, self) => self.findIndex((item) => item.id === order.id) === index
  ).length;
  const dailyRevenue = todayOrders
    .filter((order, index, self) => self.findIndex((item) => item.id === order.id) === index)
    .reduce((sum, order) => sum + (order.paymentStatus === "已付款" ? order.paidAmount || order.total : 0), 0);
  const exportFiles = [
    {
      label: "訂單明細",
      path: "/admin/export/orders.csv",
      filename: `pet-care-orders-${businessDate || "all"}.csv`,
    },
    {
      label: "會員資料",
      path: "/admin/export/members.csv",
      filename: `pet-care-members-${businessDate || "all"}.csv`,
    },
    {
      label: "營收資料",
      path: "/admin/export/revenue.csv",
      filename: `pet-care-revenue-${businessDate || "all"}.csv`,
    },
  ];

  async function handleExport(path: string, filename: string, label: string) {
    try {
      await downloadAuthenticatedFile(path, filename);
      toast.success(`${label}已匯出`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "匯出失敗");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl text-[#202124]">營運總覽</h2>
          <p className="mt-1 text-sm text-gray-500">
            依選定營業日查看預約、住宿、營收和待處理事項。
          </p>
          <span className="mt-3 inline-flex rounded-md bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
            {businessDate || "-"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "前一天",
              date: addDays(businessDate, -1),
              icon: <ChevronLeft className="h-4 w-4" />,
            },
            { label: "今天", date: todayDate },
            {
              label: "後一天",
              date: addDays(businessDate, 1),
              icon: <ChevronRight className="h-4 w-4" />,
            },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onBusinessDateChange(item.date)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 ${
                businessDate === item.date
                  ? "border-[#202124] bg-[#202124] text-white hover:bg-[#202124]"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {item.label === "後一天" ? null : item.icon}
              {item.label}
              {item.label === "後一天" ? item.icon : null}
            </button>
          ))}
          <input
            type="date"
            value={businessDate}
            onChange={(event) => onBusinessDateChange(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-[#6f9fc2]"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<CalendarDays className="w-5 h-5" />}
          label="當日預約"
          value={dailyOrderCount}
          helper="依選定營業日統計"
          tone="blue"
        />
        <MetricCard
          icon={<Home className="w-5 h-5" />}
          label="當日住宿"
          value={
            (dailyWorkflowColumns.find((item) => item.id === "checkin")?.orders.length || 0) +
            (dailyWorkflowColumns.find((item) => item.id === "checkout")?.orders.length || 0)
          }
          helper={`入住 ${dailyWorkflowColumns.find((item) => item.id === "checkin")?.orders.length || 0}、退房 ${dailyWorkflowColumns.find((item) => item.id === "checkout")?.orders.length || 0}`}
          tone="green"
        />
        <MetricCard
          icon={<Scissors className="w-5 h-5" />}
          label="當日美容"
          value={dailyWorkflowColumns.find((item) => item.id === "grooming")?.orders.length || 0}
          helper="選定日期美容排程"
          tone="blue"
        />
        <MetricCard
          icon={<CreditCard className="w-5 h-5" />}
          label="當日營收"
          value={`NT$ ${dailyRevenue.toLocaleString()}`}
          helper="選定日期已收款訂單"
          tone="gold"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <SectionHeader
            title="當日預約時窗"
            caption="依開始時間排序，方便櫃檯確認報到與人力配置。"
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-[#fbfcfd] text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-normal">時間</th>
                  <th className="px-4 py-3 font-normal">寵物</th>
                  <th className="px-4 py-3 font-normal">服務</th>
                  <th className="px-4 py-3 font-normal">負責安排</th>
                  <th className="px-4 py-3 font-normal">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todaySchedule.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                      這天還沒有預約時窗
                    </td>
                  </tr>
                ) : (
                  todaySchedule.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-[#fbfcfd]"
                      onClick={() => onSelectOrder(order.id)}
                    >
                      <td className="px-4 py-3 text-[#202124]">
                        {order.scheduledTime || (order.serviceType === "accommodation" ? "住宿" : "-")}
                      </td>
                      <td className="px-4 py-3">{order.petName || "未提供"}</td>
                      <td className="px-4 py-3 text-gray-600">{serviceName(order)}</td>
                      <td className="px-4 py-3 text-gray-600">{order.assignedSpot || "待安排"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg text-[#202124]">當日營運重點</h3>
            <div className="mt-4 space-y-3">
              <PriorityNotice
                tone="gold"
                title="待審核入住"
                text={`${dailyWorkflowColumns.find((item) => item.id === "pending")?.orders.length || 0} 筆當日訂單待確認，優先處理這天會到店的服務。`}
              />
              <PriorityNotice
                tone="blue"
                title="即將到期會員"
                text={`${todayUnpaidOrders.length} 筆當日訂單待收款或尾款，需提醒家長完成付款。`}
              />
              <button
                type="button"
                onClick={() => onSelectOrder(todayUnassignedOrders[0]?.id || todaySchedule[0]?.id || "")}
                disabled={todayUnassignedOrders.length === 0 && todaySchedule.length === 0}
                className="w-full rounded-lg bg-[#2f6fed] px-4 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-200"
              >
                處理優先事項
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg text-[#202124]">包套資格即將到期</h3>
            <PriorityNotice
              tone="gold"
              title="近期到期提醒"
              text="目前尚未建立包套會員資料，新增後可在這裡顯示 7 天內到期名單。"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg text-[#202124]">營運統計報表</h2>
            <p className="text-sm text-gray-500">
              熱門服務、取消率與人員工作量摘要
            </p>
          </div>
          <BarChart3 className="w-5 h-5 text-[#6f9fc2]" />
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat
            label="熱門服務"
            value={reportMetrics.popularService}
            icon={<Sparkles className="w-4 h-4" />}
          />
          <MiniStat
            label="取消率"
            value={`${reportMetrics.cancelRate}%`}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <MiniStat
            label="美容工作量"
            value={reportMetrics.groomingWorkload}
            icon={<Scissors className="w-4 h-4" />}
          />
          <MiniStat
            label="照護工作量"
            value={reportMetrics.careWorkload}
            icon={<Home className="w-4 h-4" />}
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg text-[#202124]">資料匯出</h2>
            <p className="mt-1 text-sm text-gray-500">
              下載 CSV 做報表、結帳或會員資料整理。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {exportFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => handleExport(file.path, file.filename, file.label)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#202124] hover:bg-gray-50"
              >
                <Save className="h-4 w-4" />
                匯出{file.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="mb-3">
            <h2 className="text-2xl text-[#202124]">當日工作流</h2>
            <p className="text-sm text-gray-500 mt-1">
              只顯示選定日期與目前需要處理的預約
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {dailyWorkflowColumns.map((column) => (
              <WorkColumn
                key={column.id}
                title={column.title}
                subtitle={column.subtitle}
                tone={column.tone}
                orders={column.orders}
                updatingId={updatingId}
                onSelectOrder={onSelectOrder}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              title="當日任務清單"
              caption="店務人員每日處理重點"
              icon={<ClipboardList className="w-5 h-5" />}
            />

            <div className="p-4 space-y-2">
              {[
                {
                  label: "確認待確認訂單",
                  count: dailyWorkflowColumns.find((item) => item.id === "pending")?.orders.length || 0,
                },
                {
                  label: "安排當日入住與退房",
                  count:
                    (dailyWorkflowColumns.find((item) => item.id === "checkin")?.orders.length || 0) +
                    (dailyWorkflowColumns.find((item) => item.id === "checkout")?.orders.length || 0),
                },
                {
                  label: "確認當日美容時段",
                  count: dailyWorkflowColumns.find((item) => item.id === "grooming")?.orders.length || 0,
                },
                {
                  label: "補齊未安排位置",
                  count: todayUnassignedOrders.length,
                },
                {
                  label: "追蹤未付款/尾款",
                  count: todayUnpaidOrders.length,
                },
              ].map((task) => (
                <div
                  key={task.label}
                  className="flex items-center justify-between rounded-lg bg-[#f7f8fa] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        task.count === 0 ? "text-[#5f8a5f]" : "text-[#c8a15f]"
                      }`}
                    />
                    <span className="text-sm text-[#202124]">{task.label}</span>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600">
                    {task.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              title="尚未安排"
              caption={`${unassignedOrders.length} 筆需要指定位置`}
              icon={<PawPrint className="w-5 h-5" />}
            />

            <div className="p-4 space-y-3">
              {unassignedOrders.length === 0 ? (
                <EmptyNote text="目前所有未結案訂單都已安排位置" />
              ) : (
                unassignedOrders.slice(0, 6).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className="w-full rounded-lg bg-[#f7f8fa] px-3 py-2 text-left hover:bg-[#eef3f6]"
                  >
                    <p className="text-sm text-[#202124]">
                      #{order.id} {order.petName || "未提供"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {serviceName(order)} / {assignmentHint(order)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              title="付款提醒"
              caption={`${unpaidOrders.length} 筆待收款或尾款`}
              icon={<CreditCard className="w-5 h-5" />}
            />

            <div className="p-4 space-y-3">
              {unpaidOrders.length === 0 ? (
                <EmptyNote text="目前沒有待付款訂單" />
              ) : (
                unpaidOrders.slice(0, 5).map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className="w-full rounded-lg bg-[#f7f8fa] px-3 py-2 text-left hover:bg-[#eef3f6]"
                  >
                    <p className="text-sm text-[#202124]">
                      #{order.id} {order.petName || "未提供"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {serviceName(order)} / {paymentSummary(order)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AnalyticsWorkspace({
  stats,
  sortedOrders,
  serviceCounts,
  reportMetrics,
  dashboardCharts,
}: {
  stats: AdminStats | null;
  sortedOrders: Order[];
  serviceCounts: { accommodation: number; grooming: number };
  reportMetrics: {
    cancelRate: number;
    popularService: string;
    roomUsage: { label: string; count: number }[];
    groomingUsage: { label: string; count: number }[];
    groomingWorkload: number;
    careWorkload: number;
  };
  dashboardCharts: DashboardCharts;
}) {
  const validOrders = sortedOrders.filter((order) => order.status !== "已取消");
  const completedOrders = sortedOrders.filter((order) => order.status === "已完成");
  const paidOrders = validOrders.filter((order) => order.paymentStatus === "已付款");
  const totalSales = validOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = validOrders.length
    ? Math.round(totalSales / validOrders.length)
    : 0;
  const completionRate = validOrders.length
    ? Math.round((completedOrders.length / validOrders.length) * 100)
    : 0;
  const paymentRate = validOrders.length
    ? Math.round((paidOrders.length / validOrders.length) * 100)
    : 0;
  const serviceRanking = [
    ...reportMetrics.roomUsage,
    ...reportMetrics.groomingUsage,
  ]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const weeklyOrders = dashboardCharts.recentOrders.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const firstLineMetrics = [
    { label: "會員總量", value: stats?.stats.members || 0, helper: "目前累計會員" },
    { label: "寵物檔案", value: stats?.stats.pets || 0, helper: "已建檔毛孩" },
    { label: "服務次數", value: validOrders.length, helper: "排除取消訂單" },
    { label: "回訪率", value: `${completionRate}%`, helper: "以完成訂單估算" },
    { label: "新客會員", value: Math.max(0, (stats?.stats.members || 0) - paidOrders.length), helper: "需串接會員來源後可更準" },
    { label: "客單價", value: `NT$ ${averageOrderValue.toLocaleString()}`, helper: "有效訂單平均" },
    { label: "付款完成率", value: `${paymentRate}%`, helper: "已付款 / 有效訂單" },
    { label: "取消率", value: `${reportMetrics.cancelRate}%`, helper: "已取消 / 全部訂單" },
    { label: "住宿工作量", value: reportMetrics.careWorkload, helper: "住宿服務訂單" },
    { label: "美容工作量", value: reportMetrics.groomingWorkload, helper: "美容服務訂單" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl text-[#202124]">經營分析</h2>
        <p className="mt-1 text-sm text-gray-500">
          從櫃檯視角整理會員、訂單、服務量和收款狀況，協助判斷今日與近期營運壓力。
        </p>
      </section>

      <section className="rounded-lg border border-[#dbe8ff] bg-[#f3f7ff] px-4 py-3 text-sm text-[#315d91]">
        來源說明：目前以系統中的預約與訂單資料即時計算，若之後新增 POS 或廣告來源，可再補毛利、來源轉換與活動成效。
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AnalysisMetric label="會員總量" value={stats?.stats.members || 0} delta="+75.0%" />
        <AnalysisMetric label="寵物檔案" value={stats?.stats.pets || 0} delta="+66.7%" tone="green" />
        <AnalysisMetric label="服務次數" value={validOrders.length} delta="+50.0%" tone="gold" />
        <AnalysisMetric label="回訪率" value={`${completionRate}%`} delta="+4.7%" tone="blue" />
        <AnalysisMetric label="近 7 天預約" value={weeklyOrders} delta="即時" tone="green" />
      </section>

      <ChartPanel title="核心趨勢" caption="近 7 天預約量、服務占比與房況壓力">
        <MiniColumnChart data={dashboardCharts.recentOrders} />
      </ChartPanel>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
        <ChartPanel title="服務結構分布" caption="住宿與美容預約占比">
          <DonutChart data={dashboardCharts.service} centerLabel="本期服務" />
        </ChartPanel>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg text-[#202124]">服務排行</h3>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbfcfd] text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-normal">名次</th>
                  <th className="px-3 py-2 font-normal">服務項目</th>
                  <th className="px-3 py-2 font-normal">本期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serviceRanking.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center text-gray-500" colSpan={3}>
                      目前沒有服務資料
                    </td>
                  </tr>
                ) : (
                  serviceRanking.map((item, index) => (
                    <tr key={item.label}>
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2 text-[#202124]">{item.label}</td>
                      <td className="px-3 py-2">{item.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg text-[#202124]">經營摘要</h3>
          <div className="mt-4 space-y-3">
            <SummaryLine label="主力服務" value={reportMetrics.popularService} />
            <SummaryLine label="住宿 / 美容" value={`${serviceCounts.accommodation} / ${serviceCounts.grooming}`} />
            <SummaryLine label="已收款營收" value={`NT$ ${(stats?.stats.revenue || 0).toLocaleString()}`} />
            <div className="rounded-lg bg-[#edf6fc] p-3 text-sm text-[#315d91]">
              櫃檯可優先追蹤待付款、未安排位置與近 72 小時內服務訂單。
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg text-[#202124]">第一期 10 大經營指標</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {firstLineMetrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-gray-100 bg-[#fbfcfd] p-3">
              <p className="text-xs text-gray-500">{metric.label}</p>
              <p className="mt-2 text-xl text-[#202124]">{metric.value}</p>
              <p className="mt-2 text-xs text-gray-500">{metric.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="房型使用率" caption="今日各房型入住壓力">
          <HorizontalBarChart data={dashboardCharts.roomOccupancy} suffix="%" />
        </ChartPanel>
        <ChartPanel title="付款狀態" caption="未付款、訂金與已付款">
          <DonutChart data={dashboardCharts.payment} centerLabel="付款" />
        </ChartPanel>
      </section>
    </div>
  );
}

function RoomManagement({
  stats,
  businessDate,
  roomGuestsByType,
  todayCheckIns,
  todayCheckOuts,
  assignmentOptions,
  onSelectOrder,
}: {
  stats: AdminStats | null;
  businessDate: string;
  roomGuestsByType: Record<RoomType, Order[]>;
  todayCheckIns: Order[];
  todayCheckOuts: Order[];
  assignmentOptions: AssignmentOptions;
  onSelectOrder: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-[#202124]">房況管理</h2>
        <p className="text-sm text-gray-500 mt-1">
          {businessDate || "-"} 的入住名單與房型容量
        </p>
      </div>

      <section className="grid lg:grid-cols-3 gap-4">
        {roomTypes.map((roomType) => {
          const room = stats?.rooms[roomType];
          const guests = roomGuestsByType[roomType];
          const percent = room
            ? Math.round((room.booked / room.capacity) * 100)
            : 0;

          return (
            <div
              key={roomType}
              className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl text-[#202124]">
                      {roomNames[roomType]}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      已住 {room?.booked || 0} / 容量 {room?.capacity || 0}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      (room?.remaining || 0) > 0
                        ? "bg-[#eef7ef] text-[#4f7f55]"
                        : "bg-[#fff0f0] text-[#b85c68]"
                    }`}
                  >
                    剩 {room?.remaining || 0}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-4">
                  <div
                    className="h-full bg-[#6f9fc2]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="p-4 space-y-3">
                {(assignmentOptions.roomSpots[roomType] || []).map((spot) => {
                  const occupant = guests.find(
                    (order) => order.assignedSpot === spot
                  );

                  return (
                    <SpotCard
                      key={spot}
                      spot={spot}
                      order={occupant}
                      onSelectOrder={onSelectOrder}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <ScheduleList
          title="今日入住"
          orders={todayCheckIns}
          emptyText="今天沒有入住安排"
          onSelectOrder={onSelectOrder}
        />
        <ScheduleList
          title="今日退房"
          orders={todayCheckOuts}
          emptyText="今天沒有退房安排"
          onSelectOrder={onSelectOrder}
        />
      </section>
    </div>
  );
}

function StaffingWorkspace({
  api,
  isSystemAdmin,
  businessDate,
}: {
  api: (path: string, options?: RequestInit) => Promise<any>;
  isSystemAdmin: boolean;
  businessDate: string;
}) {
  const initialDate = businessDate || formatDateKey(new Date());
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(() => addDays(initialDate, 7));
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    workDate: initialDate,
    shiftLabel: defaultBusinessSettings.shifts[0],
    note: "",
  });

  async function loadShifts(showToast = false) {
    try {
      setLoading(true);
      const data = await api(`/admin/staff-shifts?startDate=${startDate}&endDate=${endDate}`);
      setShifts(data.shifts || []);
      setUsers(data.users || []);
      if (showToast) toast.success("排班已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "排班資料讀取失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShifts();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!form.userId && users.length > 0) {
      setForm((current) => ({ ...current, userId: users[0].id }));
    }
  }, [users, form.userId]);

  const groupedShifts = useMemo(() => {
    return shifts.reduce<Record<string, StaffShift[]>>((result, shift) => {
      result[shift.workDate] = [...(result[shift.workDate] || []), shift];
      return result;
    }, {});
  }, [shifts]);

  const staffCounts = useMemo(() => {
    return shifts.reduce<Record<string, number>>((result, shift) => {
      result[shift.roleLabel] = (result[shift.roleLabel] || 0) + 1;
      return result;
    }, {});
  }, [shifts]);

  async function createShift() {
    if (!form.userId || !form.workDate || !form.shiftLabel) {
      toast.error("請選擇員工、日期與班別");
      return;
    }

    try {
      setSaving(true);
      await api("/admin/staff-shifts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm((current) => ({ ...current, note: "" }));
      await loadShifts();
      toast.success("排班已新增");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增排班失敗");
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(shiftId: string) {
    try {
      setSaving(true);
      await api(`/admin/staff-shifts/${shiftId}`, { method: "DELETE" });
      await loadShifts();
      toast.success("排班已刪除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刪除排班失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-[#6f9fc2]">STAFF SCHEDULE</p>
            <h2 className="mt-1 text-2xl text-[#202124]">員工排班</h2>
            <p className="mt-1 text-sm text-gray-500">
              管理櫃檯、美容師與照護師班別，工作人員登入後會在自己的工作排程看到班表。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_auto]">
            <SmallInput type="date" label="起始" value={startDate} onChange={setStartDate} />
            <SmallInput type="date" label="結束" value={endDate} onChange={setEndDate} />
            <button
              type="button"
              onClick={() => loadShifts(true)}
              className="self-end rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              重新整理
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["店務人員", "美容師", "寵物照護師", "系統管理員"].map((label) => (
            <MetricCard
              key={label}
              icon={<Users className="h-5 w-5" />}
              label={label}
              value={staffCounts[label] || 0}
              helper="區間內排班數"
              tone={label === "美容師" ? "rose" : label === "寵物照護師" ? "green" : "blue"}
            />
          ))}
        </div>
      </section>

      {isSystemAdmin && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg text-[#202124]">新增排班</h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_220px_1fr_auto]">
            <SelectField
              label="員工"
              value={form.userId}
              onChange={(value) => setForm((current) => ({ ...current, userId: value }))}
              options={users.map((item) => ({
                value: item.id,
                label: `${item.name} / ${systemRoleNames[item.role]}`,
              }))}
            />
            <SmallInput
              type="date"
              label="日期"
              value={form.workDate}
              onChange={(value) => setForm((current) => ({ ...current, workDate: value }))}
            />
            <SmallInput
              label="班別"
              value={form.shiftLabel}
              onChange={(value) => setForm((current) => ({ ...current, shiftLabel: value }))}
            />
            <SmallInput
              label="備註"
              value={form.note}
              onChange={(value) => setForm((current) => ({ ...current, note: value }))}
            />
            <button
              type="button"
              disabled={saving}
              onClick={createShift}
              className="self-end rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              新增
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <SectionHeader
          title="排班總覽"
          caption={loading ? "正在讀取..." : `${shifts.length} 筆排班`}
          icon={<Clock className="h-5 w-5" />}
        />
        <div className="divide-y divide-gray-100">
          {Object.keys(groupedShifts).length === 0 ? (
            <div className="p-5">
              <EmptyNote text="這個區間尚未安排員工班表" />
            </div>
          ) : (
            Object.entries(groupedShifts).map(([date, dateShifts]) => (
              <div key={date} className="p-5">
                <h3 className="text-lg text-[#202124]">{date}</h3>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {dateShifts.map((shift) => (
                    <div key={shift.id} className="rounded-lg border border-gray-200 bg-[#fbfcfd] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#202124]">
                            {shift.shiftLabel} / {shift.userName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {shift.roleLabel} ・ {shift.userEmail}
                          </p>
                          {shift.note && (
                            <p className="mt-2 text-sm text-gray-600">{shift.note}</p>
                          )}
                        </div>
                        {isSystemAdmin && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => deleteShift(shift.id)}
                            className="rounded-lg border border-[#b85c68] px-3 py-1.5 text-xs text-[#b85c68] hover:bg-[#fff0f0]"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsPanel({
  api,
  options,
  saving,
  onSave,
}: {
  api: (path: string, options?: RequestInit) => Promise<any>;
  options: AssignmentOptions;
  saving: boolean;
  onSave: (options: AssignmentOptions) => void;
}) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalog>(
    defaultServiceCatalog
  );
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(
    defaultBusinessSettings
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);
  const [systemLoading, setSystemLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "staff" as SystemRole,
  });
  const [roomInputs, setRoomInputs] = useState<Record<RoomType, string>>({
    standard: "",
    deluxe: "",
    vip: "",
  });
  const [groomingStations, setGroomingStations] = useState("");
  const [groomingTimes, setGroomingTimes] = useState("");
  const [shiftInput, setShiftInput] = useState("");
  const [closedDateInput, setClosedDateInput] = useState("");
  const [channelInput, setChannelInput] = useState("");

  async function loadSystemSettings() {
    try {
      setSystemLoading(true);
      const [usersData, catalogData, businessData, notificationData] =
        await Promise.all([
          api("/admin/system/users"),
          api("/admin/system/service-catalog"),
          api("/admin/system/business-settings"),
          api("/admin/system/notification-settings"),
        ]);

      setUsers(usersData.users || []);
      setServiceCatalog({
        roomPrices: catalogData.roomPrices || defaultServiceCatalog.roomPrices,
        groomingPrices:
          catalogData.groomingPrices || defaultServiceCatalog.groomingPrices,
      });
      setBusinessSettings({
        weekdayHours:
          businessData.weekdayHours || defaultBusinessSettings.weekdayHours,
        weekendHours:
          businessData.weekendHours || defaultBusinessSettings.weekendHours,
        shifts: businessData.shifts || defaultBusinessSettings.shifts,
        closedDates: businessData.closedDates || [],
      });
      setNotificationSettings({
        bookingReminderHours:
          notificationData.bookingReminderHours ??
          defaultNotificationSettings.bookingReminderHours,
        paymentReminderHours:
          notificationData.paymentReminderHours ??
          defaultNotificationSettings.paymentReminderHours,
        careLogNotifyCustomer:
          notificationData.careLogNotifyCustomer ??
          defaultNotificationSettings.careLogNotifyCustomer,
        channels: notificationData.channels || defaultNotificationSettings.channels,
        staffReminderText:
          notificationData.staffReminderText ||
          defaultNotificationSettings.staffReminderText,
      });
      setShiftInput(listToInput(businessData.shifts || []));
      setClosedDateInput(listToInput(businessData.closedDates || []));
      setChannelInput(listToInput(notificationData.channels || []));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "系統設定讀取失敗");
    } finally {
      setSystemLoading(false);
    }
  }

  useEffect(() => {
    loadSystemSettings();
  }, []);

  useEffect(() => {
    setRoomInputs({
      standard: listToInput(options.roomSpots.standard || []),
      deluxe: listToInput(options.roomSpots.deluxe || []),
      vip: listToInput(options.roomSpots.vip || []),
    });
    setGroomingStations(listToInput(options.groomingStations));
    setGroomingTimes(listToInput(options.groomingTimes));
  }, [options]);

  const saveAssignments = () => {
    onSave({
      roomSpots: {
        standard: inputToList(roomInputs.standard),
        deluxe: inputToList(roomInputs.deluxe),
        vip: inputToList(roomInputs.vip),
      },
      groomingStations: inputToList(groomingStations),
      groomingTimes: inputToList(groomingTimes),
    });
  };

  async function createSystemUser() {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error("請填寫員工帳號資料");
      return;
    }

    try {
      setSavingSection("users");
      await api("/admin/system/users", {
        method: "POST",
        body: JSON.stringify(newUser),
      });
      setNewUser({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "staff",
      });
      await loadSystemSettings();
      toast.success("員工帳號已新增");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "員工帳號新增失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function updateSystemUser(user: SystemUser) {
    try {
      setSavingSection(`user-${user.id}`);
      await api(`/admin/system/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(user),
      });
      await loadSystemSettings();
      toast.success("員工帳號已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "員工帳號更新失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function deleteSystemUser(user: SystemUser) {
    try {
      setSavingSection(`user-${user.id}`);
      await api(`/admin/system/users/${user.id}`, { method: "DELETE" });
      await loadSystemSettings();
      toast.success("員工帳號已刪除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "員工帳號刪除失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function saveServiceCatalog() {
    try {
      setSavingSection("catalog");
      const data = await api("/admin/system/service-catalog", {
        method: "PATCH",
        body: JSON.stringify(serviceCatalog),
      });
      setServiceCatalog({
        roomPrices: data.roomPrices,
        groomingPrices: data.groomingPrices,
      });
      toast.success("服務價格已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "服務價格更新失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function saveBusinessSettings() {
    try {
      setSavingSection("business");
      const data = await api("/admin/system/business-settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...businessSettings,
          shifts: inputToList(shiftInput),
          closedDates: inputToList(closedDateInput),
        }),
      });
      setBusinessSettings(data);
      setShiftInput(listToInput(data.shifts || []));
      setClosedDateInput(listToInput(data.closedDates || []));
      toast.success("營業與班表設定已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "營業設定更新失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function saveNotificationSettings() {
    try {
      setSavingSection("notification");
      const data = await api("/admin/system/notification-settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...notificationSettings,
          channels: inputToList(channelInput),
        }),
      });
      setNotificationSettings(data);
      setChannelInput(listToInput(data.channels || []));
      toast.success("通知設定已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "通知設定更新失敗");
    } finally {
      setSavingSection(null);
    }
  }

  async function downloadBackup() {
    try {
      setSavingSection("backup");
      const data = await api("/admin/system/backup");
      downloadJsonFile(data, `pet-care-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("系統備份已下載");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "備份下載失敗");
    } finally {
      setSavingSection(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl text-[#202124]">系統管理員設定</h2>
          <p className="mt-1 text-sm text-gray-500">
            管理店務帳號、服務價格、營業班表、通知規則與可安排資源。這些設定只開放系統管理員修改。
          </p>
        </div>
        <button
          type="button"
          disabled={savingSection === "backup"}
          onClick={downloadBackup}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#202124] px-4 py-2.5 text-sm text-[#202124] hover:bg-gray-50 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {savingSection === "backup" ? "下載中..." : "下載系統備份"}
        </button>
      </div>

      {systemLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          正在讀取系統設定...
        </div>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-xl text-[#202124]">員工帳號與權限</h3>
          <p className="mt-1 text-sm text-gray-500">
          店務人員可處理訂單；美容師與照護師可查看工作排程、紀錄服務並通知家長；系統管理員可額外編輯營運設定。
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          <input
            value={newUser.name}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, name: event.target.value }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            placeholder="姓名"
          />
          <input
            value={newUser.email}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, email: event.target.value }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            placeholder="Email"
          />
          <input
            value={newUser.phone}
            onChange={(event) =>
              setNewUser((current) => ({ ...current, phone: event.target.value }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            placeholder="電話"
          />
          <input
            value={newUser.password}
            onChange={(event) =>
              setNewUser((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
            placeholder="初始密碼"
            type="password"
          />
          <select
            value={newUser.role}
            onChange={(event) =>
              setNewUser((current) => ({
                ...current,
                role: event.target.value as SystemRole,
              }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
          >
            {Object.entries(systemRoleNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={savingSection === "users"}
          onClick={createSystemUser}
          className="mt-3 rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white disabled:opacity-60"
        >
          新增員工帳號
        </button>

        <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {users.map((user) => (
            <div key={user.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_1fr_150px_auto] lg:items-center">
              <div>
                <p className="text-sm text-[#202124]">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <input
                value={user.phone}
                onChange={(event) =>
                  setUsers((current) =>
                    current.map((item) =>
                      item.id === user.id
                        ? { ...item, phone: event.target.value }
                        : item
                    )
                  )
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              />
              <select
                value={user.role}
                onChange={(event) =>
                  setUsers((current) =>
                    current.map((item) =>
                      item.id === user.id
                        ? {
                            ...item,
                            role: event.target.value as SystemRole,
                          }
                        : item
                    )
                  )
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              >
                {Object.entries(systemRoleNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateSystemUser(user)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => deleteSystemUser(user)}
                  className="rounded-lg border border-[#b85c68] px-3 py-2 text-sm text-[#b85c68] hover:bg-[#fff0f0]"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl text-[#202124]">房間、設施與價格</h3>
            <p className="mt-1 text-sm text-gray-500">
              設定住宿房型價格、美容服務價格，以及可安排的房位、美容台與時段。
            </p>
          </div>
          <button
            type="button"
            disabled={savingSection === "catalog"}
            onClick={saveServiceCatalog}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            儲存價格
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PriceEditor
            title="住宿房型價格"
            names={roomNames}
            values={serviceCatalog.roomPrices}
            onChange={(key, value) =>
              setServiceCatalog((current) => ({
                ...current,
                roomPrices: { ...current.roomPrices, [key]: value },
              }))
            }
          />
          <PriceEditor
            title="美容服務價格"
            names={groomingNames}
            values={serviceCatalog.groomingPrices}
            onChange={(key, value) =>
              setServiceCatalog((current) => ({
                ...current,
                groomingPrices: { ...current.groomingPrices, [key]: value },
              }))
            }
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={saveAssignments}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#202124] px-4 py-2.5 text-sm text-[#202124] hover:bg-gray-50 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "儲存中..." : "儲存位置與時段"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {roomTypes.map((roomType) => (
            <label key={roomType} className="block rounded-lg border border-gray-200 p-4">
              <span className="text-sm text-gray-500">{roomNames[roomType]}</span>
              <textarea
                value={roomInputs[roomType]}
                onChange={(event) =>
                  setRoomInputs((current) => ({
                    ...current,
                    [roomType]: event.target.value,
                  }))
                }
                rows={6}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
                placeholder="S-01, S-02, S-03"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <label className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-sm text-gray-500">美容台</span>
          <textarea
            value={groomingStations}
            onChange={(event) => setGroomingStations(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            placeholder="G-01, G-02, G-03"
          />
        </label>

        <label className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-sm text-gray-500">美容時段</span>
          <textarea
            value={groomingTimes}
            onChange={(event) => setGroomingTimes(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            placeholder="09:00, 10:30, 13:00"
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-xl text-[#202124]">營業時間與排班</h3>
          <div className="mt-4 grid gap-3">
            <SettingInput
              label="平日營業時間"
              value={businessSettings.weekdayHours}
              onChange={(value) =>
                setBusinessSettings((current) => ({
                  ...current,
                  weekdayHours: value,
                }))
              }
            />
            <SettingInput
              label="假日營業時間"
              value={businessSettings.weekendHours}
              onChange={(value) =>
                setBusinessSettings((current) => ({
                  ...current,
                  weekendHours: value,
                }))
              }
            />
            <SettingTextarea
              label="班表班次"
              value={shiftInput}
              onChange={setShiftInput}
              placeholder="早班 09:00-15:00&#10;晚班 15:00-21:00"
            />
            <SettingTextarea
              label="休假日"
              value={closedDateInput}
              onChange={setClosedDateInput}
              placeholder="2026-06-01&#10;2026-06-02"
            />
          </div>
          <button
            type="button"
            disabled={savingSection === "business"}
            onClick={saveBusinessSettings}
            className="mt-4 rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            儲存營業設定
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-xl text-[#202124]">系統通知與提醒</h3>
          <div className="mt-4 grid gap-3">
            <SettingInput
              label="預約前提醒客戶（小時）"
              type="number"
              value={String(notificationSettings.bookingReminderHours)}
              onChange={(value) =>
                setNotificationSettings((current) => ({
                  ...current,
                  bookingReminderHours: Number(value),
                }))
              }
            />
            <SettingInput
              label="付款提醒（小時）"
              type="number"
              value={String(notificationSettings.paymentReminderHours)}
              onChange={(value) =>
                setNotificationSettings((current) => ({
                  ...current,
                  paymentReminderHours: Number(value),
                }))
              }
            />
            <label className="flex items-center gap-2 rounded-lg bg-[#f7f8fa] px-3 py-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={notificationSettings.careLogNotifyCustomer}
                onChange={(event) =>
                  setNotificationSettings((current) => ({
                    ...current,
                    careLogNotifyCustomer: event.target.checked,
                  }))
                }
              />
              新增公開照護紀錄時提醒客戶
            </label>
            <SettingTextarea
              label="通知方式"
              value={channelInput}
              onChange={setChannelInput}
              placeholder="站內通知&#10;Email"
            />
            <SettingTextarea
              label="店務提醒文字"
              value={notificationSettings.staffReminderText}
              onChange={(value) =>
                setNotificationSettings((current) => ({
                  ...current,
                  staffReminderText: value,
                }))
              }
              placeholder="請確認今日入住、退房、美容與待收款項目。"
            />
          </div>
          <button
            type="button"
            disabled={savingSection === "notification"}
            onClick={saveNotificationSettings}
            className="mt-4 rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white disabled:opacity-60"
          >
            儲存通知設定
          </button>
        </div>
      </section>
    </div>
  );
}

function PriceEditor<T extends string>({
  title,
  names,
  values,
  onChange,
}: {
  title: string;
  names: Record<T, string>;
  values: Record<T, number>;
  onChange: (key: T, value: number) => void;
}) {
  return (
    <div className="rounded-lg bg-[#f7f8fa] p-4">
      <h4 className="text-sm text-[#202124]">{title}</h4>
      <div className="mt-3 space-y-3">
        {Object.entries(names).map(([key, label]) => (
          <label key={key} className="grid grid-cols-[1fr_130px] items-center gap-3 text-sm">
            <span className="text-gray-600">{String(label)}</span>
            <input
              type="number"
              min={0}
              value={values[key as T]}
              onChange={(event) => onChange(key as T, Number(event.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function SettingTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function OrderSearchPanel({
  query,
  statusFilter,
  serviceFilter,
  paymentFilter,
  dateFromFilter,
  dateToFilter,
  visibleOrders,
  totalOrders,
  filteredCount,
  hasFilters,
  updatingId,
  onQueryChange,
  onStatusFilterChange,
  onServiceFilterChange,
  onPaymentFilterChange,
  onDateFromFilterChange,
  onDateToFilterChange,
  onSelectOrder,
  onUpdateStatus,
}: {
  query: string;
  statusFilter: string;
  serviceFilter: string;
  paymentFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  visibleOrders: Order[];
  totalOrders: number;
  filteredCount: number;
  hasFilters: boolean;
  updatingId: string | null;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onServiceFilterChange: (value: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onDateFromFilterChange: (value: string) => void;
  onDateToFilterChange: (value: string) => void;
  onSelectOrder: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl text-[#202124]">訂單查詢</h2>
            <p className="text-sm text-gray-500 mt-1">
              {hasFilters
                ? `顯示 ${filteredCount} / ${totalOrders} 筆符合條件的訂單`
                : `預設顯示最近 10 筆，共 ${totalOrders} 筆訂單`}
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-full lg:w-72 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#6f9fc2] focus:ring-2 focus:ring-[#dcecf7]"
                placeholder="搜尋訂單、客戶、寵物"
              />
            </div>

            <div className="flex rounded-lg border border-gray-200 bg-[#f7f8fa] p-1">
              {serviceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onServiceFilterChange(option.value)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-all ${
                    serviceFilter === option.value
                      ? "bg-white text-[#202124] shadow-sm"
                      : "text-gray-500 hover:text-[#202124]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            >
              <option value="全部">全部狀態</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => onPaymentFilterChange(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            >
              <option value="全部">全部付款</option>
              {paymentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[180px_180px_auto]">
          <label className="block">
            <span className="text-xs text-gray-500">開始日期</span>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => onDateFromFilterChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">結束日期</span>
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => onDateToFilterChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              onStatusFilterChange("全部");
              onServiceFilterChange("全部");
              onPaymentFilterChange("全部");
              onDateFromFilterChange("");
              onDateToFilterChange("");
            }}
            className="self-end rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            清除篩選
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-[#f7f8fa] text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">訂單</th>
              <th className="px-5 py-3 font-medium">客戶</th>
              <th className="px-5 py-3 font-medium">服務</th>
              <th className="px-5 py-3 font-medium">安排</th>
              <th className="px-5 py-3 font-medium">日期</th>
              <th className="px-5 py-3 font-medium">金額</th>
              <th className="px-5 py-3 font-medium">付款</th>
              <th className="px-5 py-3 font-medium">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="cursor-pointer align-top hover:bg-[#fbfcfd]"
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-[#202124]">#{order.id}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <PawPrint className="w-3.5 h-3.5" />
                    {order.petName || "未提供"}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <p className="inline-flex items-center gap-1.5 text-[#202124]">
                    <UserRound className="w-4 h-4 text-gray-400" />
                    {order.userName || "未提供"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    {order.userEmail || "-"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {order.userPhone || "-"}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ServiceIcon type={order.serviceType} />
                    <span>{serviceName(order)}</span>
                  </div>
                  {order.notes && (
                    <p className="mt-2 max-w-[220px] truncate text-xs text-gray-500">
                      {order.notes}
                    </p>
                  )}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs ${
                      isOrderAssigned(order)
                        ? "bg-[#eef7ef] text-[#4f7f55]"
                        : "bg-[#fff8e8] text-[#a97922]"
                    }`}
                  >
                    {assignmentSummary(order)}
                  </span>
                </td>

                <td className="px-5 py-4 text-gray-600">
                  {order.startDate}
                  {order.endDate ? (
                    <span className="block text-xs text-gray-500 mt-1">
                      至 {order.endDate}
                    </span>
                  ) : null}
                </td>

                <td className="px-5 py-4 font-medium text-[#202124]">
                  NT$ {order.total.toLocaleString()}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs ${paymentBadge(
                      order.paymentStatus
                    )}`}
                  >
                    {order.paymentStatus}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {paymentSummary(order)}
                  </p>
                </td>

                <td className="px-5 py-4">
                  <StatusSelect
                    order={order}
                    updatingId={updatingId}
                    onUpdateStatus={onUpdateStatus}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleOrders.length === 0 && (
        <div className="p-10 text-center text-gray-500">
          目前沒有符合條件的訂單
        </div>
      )}
    </section>
  );
}

function WorkColumn({
  title,
  subtitle,
  orders,
  tone,
  updatingId,
  onSelectOrder,
  onUpdateStatus,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
  tone: "blue" | "green" | "rose" | "gold" | "brown";
  updatingId: string | null;
  onSelectOrder: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg text-[#202124]">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs ${toneBadge(tone)}`}>
            {orders.length}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {orders.length === 0 ? (
          <EmptyNote text="目前沒有項目" />
        ) : (
          orders.map((order) => (
            <OrderTaskCard
              key={order.id}
              order={order}
              updatingId={updatingId}
              onSelect={() => onSelectOrder(order.id)}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}

function OrderTaskCard({
  order,
  updatingId,
  onSelect,
  onUpdateStatus,
}: {
  order: Order;
  updatingId: string | null;
  onSelect: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
      className="w-full cursor-pointer rounded-lg border border-gray-200 bg-[#fbfcfd] p-3 text-left hover:border-[#cfe2ef] hover:bg-[#f7fbff]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[#202124]">
            #{order.id} {order.petName || "未提供"}
          </p>
          <p className="truncate text-xs text-gray-500 mt-1">
            {serviceName(order)} / {order.userName || "未提供"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${statusBadge(
            order.status
          )}`}
        >
          {order.status}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{dateRange(order)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {assignmentSummary(order)}
          </p>
        </div>
        <StatusSelect
          order={order}
          compact
          updatingId={updatingId}
          onUpdateStatus={onUpdateStatus}
        />
      </div>
    </div>
  );
}

function SpotCard({
  spot,
  order,
  onSelectOrder,
}: {
  spot: string;
  order?: Order;
  onSelectOrder: (id: string) => void;
}) {
  if (!order) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-[#fbfcfd] p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[#202124]">{spot}</p>
          <span className="rounded-full bg-[#eef7ef] px-2.5 py-1 text-xs text-[#4f7f55]">
            空位
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectOrder(order.id)}
      className="w-full rounded-lg bg-[#f7f8fa] p-3 text-left hover:bg-[#eef3f6]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#202124]">
            {spot} / {order.petName || "未提供"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {order.userName || "未提供"} / 至 {order.endDate || "-"}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge(order.status)}`}>
          {order.status}
        </span>
      </div>
    </button>
  );
}

function ScheduleList({
  title,
  orders,
  emptyText,
  onSelectOrder,
}: {
  title: string;
  orders: Order[];
  emptyText: string;
  onSelectOrder: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <SectionHeader
        title={title}
        caption={`${orders.length} 筆安排`}
        icon={<CalendarDays className="w-5 h-5" />}
      />

      <div className="divide-y divide-gray-100">
        {orders.length === 0 ? (
          <div className="p-4">
            <EmptyNote text={emptyText} />
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => onSelectOrder(order.id)}
              className="grid w-full gap-2 p-4 text-left hover:bg-[#fbfcfd] sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="text-[#202124]">
                  #{order.id} {order.petName || "未提供"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {serviceName(order)} / {order.userName || "未提供"}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs ${statusBadge(order.status)}`}>
                {order.status}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function AttendancePunch({
  attendance,
  saving,
  onClockIn,
  onClockOut,
}: {
  attendance: Attendance | null;
  saving: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  const hasClockIn = Boolean(attendance?.clockInAt);
  const hasClockOut = Boolean(attendance?.clockOutAt);

  return (
    <div className="hidden min-w-[290px] rounded-lg border border-gray-200 bg-[#fbfcfd] px-3 py-2 lg:block">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">櫃檯打卡</p>
          <p className="mt-0.5 text-sm text-[#202124]">
            {hasClockOut ? "今日已完成" : hasClockIn ? "上班中" : "尚未打卡"}
            <span className="ml-2 text-xs text-gray-500">
              {formatAttendanceTime(attendance?.clockInAt)} / {formatAttendanceTime(attendance?.clockOutAt)}
            </span>
          </p>
        </div>
        {!hasClockIn ? (
          <button
            type="button"
            disabled={saving}
            onClick={onClockIn}
            className="rounded-lg bg-[#202124] px-3 py-2 text-xs text-white disabled:opacity-60"
          >
            上班
          </button>
        ) : !hasClockOut ? (
          <button
            type="button"
            disabled={saving}
            onClick={onClockOut}
            className="rounded-lg border border-[#202124] px-3 py-2 text-xs text-[#202124] disabled:opacity-60"
          >
            下班
          </button>
        ) : (
          <span className="rounded-lg bg-[#eef7ef] px-3 py-2 text-xs text-[#4f7f55]">
            {formatAttendanceMinutes(attendance?.workedMinutes || 0)}
          </span>
        )}
      </div>
    </div>
  );
}

function SidebarNavItem({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
        active
          ? "bg-[#e9eefb] text-[#315d91]"
          : "text-gray-600 hover:bg-[#f7f8fa] hover:text-[#202124]"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white text-[#315d91]" : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ViewTab({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
        active
          ? "border-[#202124] bg-[#202124] text-white"
          : "border-gray-200 bg-white text-gray-600 hover:text-[#202124]"
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function PriorityNotice({
  tone,
  title,
  text,
}: {
  tone: "gold" | "blue";
  title: string;
  text: string;
}) {
  const classes =
    tone === "gold"
      ? "border-[#f0d98d] bg-[#fff7d9] text-[#7a5a12]"
      : "border-[#d4e2ff] bg-[#eef4ff] text-[#315d91]";

  return (
    <div className={`rounded-lg border p-3 ${classes}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm text-[#202124]">{title}</p>
          <p className="mt-1 text-xs leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisMetric({
  label,
  value,
  delta,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  delta: string;
  tone?: "blue" | "green" | "gold";
}) {
  const toneClass = {
    blue: "bg-[#edf6fc] text-[#3f789f]",
    green: "bg-[#eef7ef] text-[#4f7f55]",
    gold: "bg-[#fff8e8] text-[#a97922]",
  }[tone];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`rounded-lg p-2 ${toneClass}`}>
          <TrendingUp className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl text-[#202124]">{value}</p>
      <p className="mt-1 text-xs text-[#4f7f55]">{delta} 較前期</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg text-[#202124]">{value}</p>
    </div>
  );
}

function StatusSelect({
  order,
  updatingId,
  onUpdateStatus,
  compact = false,
}: {
  order: Order;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: string) => void;
  compact?: boolean;
}) {
  return (
    <select
      value={order.status}
      disabled={updatingId === order.id}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onUpdateStatus(order.id, event.target.value)}
      className={`rounded-lg border text-sm outline-none ${statusSelectClass(
        order.status
      )} ${compact ? "px-2 py-1 text-xs" : "px-3 py-2"}`}
    >
      {statusOptions.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function ServiceIcon({ type }: { type: ServiceType }) {
  return (
    <span
      className={`rounded-md p-1.5 ${
        type === "accommodation"
          ? "bg-[#edf6fc] text-[#3f789f]"
          : "bg-[#fff0f0] text-[#b85c68]"
      }`}
    >
      {type === "accommodation" ? (
        <Home className="w-4 h-4" />
      ) : (
        <Scissors className="w-4 h-4" />
      )}
    </span>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/60">{label}</p>
          <p className="mt-2 text-3xl">{value}</p>
        </div>
        <div className="rounded-lg bg-white/10 p-2 text-[#e8c9a0]">{icon}</div>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg text-[#202124]">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{caption}</p>
        </div>
        <BarChart3 className="h-5 w-5 text-[#6f9fc2]" />
      </div>
      {children}
    </div>
  );
}

function HorizontalBarChart({
  data,
  suffix = "",
}: {
  data: ChartItem[];
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = Math.max(4, Math.round((item.value / maxValue) * 100));
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-600">{item.label}</span>
              <span className="text-[#202124]">
                {item.value}
                {suffix}
                {item.helper ? ` (${item.helper})` : ""}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${width}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  data,
  centerLabel,
}: {
  data: ChartItem[];
  centerLabel: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const gradient =
    total === 0
      ? "#e5e7eb 0deg 360deg"
      : data
          .map((item) => {
            const start = cursor;
            const end = cursor + (item.value / total) * 360;
            cursor = end;
            return `${item.color} ${start}deg ${end}deg`;
          })
          .join(", ");

  return (
    <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
      <div
        className="relative mx-auto h-36 w-36 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center">
          <span className="text-xs text-gray-500">{centerLabel}</span>
          <span className="text-2xl text-[#202124]">{total}</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
            <span className="text-[#202124]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniColumnChart({ data }: { data: ChartItem[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex h-44 items-end gap-2 rounded-lg bg-[#fbfcfd] px-3 py-4">
      {data.map((item) => {
        const height = Math.max(8, Math.round((item.value / maxValue) * 120));
        return (
          <div key={item.helper || item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="text-xs text-gray-500">{item.value}</div>
            <div
              className="w-full max-w-9 rounded-t-lg"
              style={{ height: `${height}px`, backgroundColor: item.color }}
              title={item.helper}
            />
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
  tone: "blue" | "green" | "rose" | "gold";
}) {
  const toneClass = {
    blue: "bg-[#edf6fc] text-[#3f789f]",
    green: "bg-[#eef7ef] text-[#4f7f55]",
    rose: "bg-[#fff0f0] text-[#b85c68]",
    gold: "bg-[#fff8e8] text-[#a97922]",
  }[tone];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl text-[#202124] mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-2">{helper}</p>
        </div>
        <div className={`rounded-lg p-2 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-xl text-[#202124]">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  caption,
}: {
  icon: React.ReactNode;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
      <div>
        <h2 className="text-xl text-[#202124]">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{caption}</p>
      </div>
      <div className="rounded-lg bg-[#f7f8fa] p-2 text-[#6f9fc2]">{icon}</div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-[#f7f8fa] p-3 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function OrderDetailDrawer({
  order,
  tabs,
  updatingId,
  assigningId,
  payingId,
  creatingLogId,
  assignmentOptions,
  onUpdateStatus,
  onUpdateAssignment,
  onUpdatePayment,
  onCreateCareLog,
  onSelectTab,
  onCloseTab,
  onClose,
}: {
  order: Order;
  tabs: Order[];
  updatingId: string | null;
  assigningId: string | null;
  payingId: string | null;
  creatingLogId: string | null;
  assignmentOptions: AssignmentOptions;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdateAssignment: (
    id: string,
    payload: {
      assignedSpot: string;
      scheduledTime: string;
      assignmentNote: string;
    }
  ) => void;
  onUpdatePayment: (
    id: string,
    payload: {
      paymentStatus: string;
      paymentMethod: string;
      paidAmount: number;
    }
  ) => void;
  onCreateCareLog: (
    id: string,
    payload: {
      logType: string;
      message: string;
      photoUrl?: string;
      visibleToCustomer: boolean;
    }
  ) => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onClose: () => void;
}) {
  const pet = order.pet;

  return (
    <div className="fixed inset-0 z-50 bg-black/35">
      <button
        type="button"
        aria-label="關閉預約詳情"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-sm text-gray-500">預約詳情</p>
              <h2 className="text-2xl text-[#202124]">訂單 #{order.id}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {tabs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-6 pb-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`group flex min-w-[150px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                    tab.id === order.id
                      ? "border-[#202124] bg-[#202124] text-white"
                      : "border-gray-200 bg-[#f7f8fa] text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">#{tab.id} {tab.petName || "未提供"}</span>
                    <span className={`mt-0.5 block truncate ${tab.id === order.id ? "text-white/60" : "text-gray-400"}`}>
                      {tab.userName || "未提供"} / {serviceName(tab)}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`關閉訂單 ${tab.id} 分頁`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.stopPropagation();
                        onCloseTab(tab.id);
                      }
                    }}
                    className={`rounded-md p-1 ${
                      tab.id === order.id ? "text-white/70 hover:bg-white/10" : "text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 p-6">
          <section className="rounded-lg border border-gray-200 p-4">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">服務內容</p>
                <h3 className="mt-1 text-xl text-[#202124]">
                  {serviceName(order)}
                </h3>
              </div>
              <StatusSelect
                order={order}
                updatingId={updatingId}
                onUpdateStatus={onUpdateStatus}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="日期" value={dateRange(order)} />
              <DetailItem
                label="金額"
                value={`NT$ ${order.total.toLocaleString()}`}
              />
              <DetailItem label="付款" value={order.paymentStatus} />
              <DetailItem
                label="服務類型"
                value={order.serviceType === "accommodation" ? "住宿" : "美容"}
              />
            </div>

            {order.notes && (
              <div className="mt-4 rounded-lg bg-[#f7f8fa] p-3">
                <p className="text-xs text-gray-500">預約備註</p>
                <p className="mt-1 text-sm leading-relaxed text-[#202124]">
                  {order.notes}
                </p>
              </div>
            )}
          </section>

          <PaymentEditor
            order={order}
            payingId={payingId}
            onSave={onUpdatePayment}
          />

          <AssignmentEditor
            order={order}
            assigningId={assigningId}
            options={assignmentOptions}
            onSave={onUpdateAssignment}
          />

          <CareLogPanel
            order={order}
            creatingLogId={creatingLogId}
            onCreateCareLog={onCreateCareLog}
          />

          <AuditLogPanel logs={order.auditLogs || []} />

          <section className="rounded-lg border border-gray-200 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-[#edf6fc] p-2 text-[#3f789f]">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">客戶資訊</p>
                <h3 className="text-lg text-[#202124]">
                  {order.userName || "未提供"}
                </h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Email" value={order.userEmail || "-"} />
              <DetailItem label="電話" value={order.userPhone || "-"} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5efe9]">
                {pet?.imageUrl ? (
                  <>
                    <img
                      src={pet.imageUrl}
                      alt={pet.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        const fallback = event.currentTarget
                          .nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    <span className="hidden h-full w-full items-center justify-center text-3xl">
                      {petIcon(pet.species)}
                    </span>
                  </>
                ) : (
                  <span className="text-3xl">
                    {petIcon(pet?.species || "")}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">寵物資訊</p>
                <h3 className="text-2xl text-[#202124]">
                  {pet?.name || order.petName || "未提供"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {pet ? `${pet.species} / ${pet.breed}` : "尚無寵物詳細資料"}
                </p>
              </div>
            </div>

            {pet && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DetailItem label="性別" value={pet.gender} />
                  <DetailItem label="年齡" value={`${pet.age} 歲`} />
                  <DetailItem label="體重" value={`${pet.weight} kg`} />
                  <DetailItem label="物種" value={pet.species} />
                </div>

                <div className="mt-4 rounded-lg bg-[#f7f8fa] p-3">
                  <p className="text-xs text-gray-500">照護備註</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#202124]">
                    {pet.notes || "沒有特別備註"}
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function PaymentEditor({
  order,
  payingId,
  onSave,
}: {
  order: Order;
  payingId: string | null;
  onSave: (
    id: string,
    payload: {
      paymentStatus: string;
      paymentMethod: string;
      paidAmount: number;
    }
  ) => void;
}) {
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(
    order.paymentMethod || "未設定"
  );
  const [paidAmount, setPaidAmount] = useState(order.paidAmount || 0);

  useEffect(() => {
    setPaymentStatus(order.paymentStatus);
    setPaymentMethod(order.paymentMethod || "未設定");
    setPaidAmount(order.paidAmount || 0);
  }, [order.id, order.paymentStatus, order.paymentMethod, order.paidAmount]);

  const onStatusChange = (value: string) => {
    setPaymentStatus(value);

    if (value === "未付款") {
      setPaidAmount(0);
      setPaymentMethod("未設定");
    }

    if (value === "已付款") {
      setPaidAmount(order.total);
      setPaymentMethod((current) =>
        current === "未設定" ? "現金" : current
      );
    }
  };

  const submit = () => {
    if (paymentStatus === "已付訂金" && paidAmount <= 0) {
      toast.error("訂金金額需大於 0");
      return;
    }

    onSave(order.id, {
      paymentStatus,
      paymentMethod,
      paidAmount,
    });
  };

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">付款紀錄</p>
          <h3 className="text-lg text-[#202124]">{paymentSummary(order)}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${paymentBadge(
            order.paymentStatus
          )}`}
        >
          {order.paymentStatus}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-gray-500">付款狀態</span>
          <select
            value={paymentStatus}
            onChange={(event) => onStatusChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          >
            {paymentStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">付款方式</span>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            disabled={paymentStatus === "未付款"}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2] disabled:bg-gray-50"
          >
            {paymentMethodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">已收金額</span>
          <input
            type="number"
            min={0}
            max={order.total}
            value={paidAmount}
            onChange={(event) => setPaidAmount(Number(event.target.value))}
            disabled={paymentStatus !== "已付訂金"}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2] disabled:bg-gray-50"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <DetailItem
          label="訂單總額"
          value={`NT$ ${order.total.toLocaleString()}`}
        />
        <DetailItem
          label="尚餘尾款"
          value={`NT$ ${(
            order.balanceDue ?? Math.max(0, order.total - (order.paidAmount || 0))
          ).toLocaleString()}`}
        />
        <DetailItem label="收據編號" value={order.receiptNo || "尚未產生"} />
        <DetailItem
          label="付款時間"
          value={order.paidAt ? new Date(order.paidAt).toLocaleString() : "-"}
        />
      </div>

      <button
        type="button"
        disabled={payingId === order.id}
        onClick={submit}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
      >
        {payingId === order.id ? "儲存中..." : "儲存付款資料"}
      </button>
    </section>
  );
}

function CareLogPanel({
  order,
  creatingLogId,
  onCreateCareLog,
}: {
  order: Order;
  creatingLogId: string | null;
  onCreateCareLog: (
    id: string,
    payload: {
      logType: string;
      message: string;
      photoUrl?: string;
      visibleToCustomer: boolean;
    }
  ) => void;
}) {
  const [logType, setLogType] = useState("照護");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [visibleToCustomer, setVisibleToCustomer] = useState(true);

  useEffect(() => {
    setLogType("照護");
    setMessage("");
    setPhotoUrl("");
    setVisibleToCustomer(true);
  }, [order.id]);

  const careLogs = order.careLogs || [];

  const submit = () => {
    if (!message.trim()) {
      toast.error("請輸入照護紀錄內容");
      return;
    }

    onCreateCareLog(order.id, {
      logType,
      message,
      photoUrl: photoUrl.trim(),
      visibleToCustomer,
    });

    setMessage("");
    setPhotoUrl("");
  };

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-[#eef7ef] p-2 text-[#4f7f55]">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">照護紀錄</p>
          <h3 className="text-lg text-[#202124]">
            {careLogs.length} 筆紀錄
          </h3>
        </div>
      </div>

      <div className="rounded-lg bg-[#f7f8fa] p-3">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <select
            value={logType}
            onChange={(event) => setLogType(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          >
            <option value="照護">照護</option>
            <option value="餵食">餵食</option>
            <option value="散步">散步</option>
            <option value="美容">美容</option>
            <option value="健康">健康</option>
            <option value="提醒">提醒</option>
          </select>

          <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={visibleToCustomer}
              onChange={(event) => setVisibleToCustomer(event.target.checked)}
              className="h-4 w-4"
            />
            顯示給客戶
          </label>
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          placeholder="例如：晚餐已吃完，精神很好；美容已完成，皮膚狀況正常。"
        />

        <input
          value={photoUrl}
          onChange={(event) => setPhotoUrl(event.target.value)}
          className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          placeholder="照片紀錄連結（選填）"
        />

        <button
          type="button"
          disabled={creatingLogId === order.id}
          onClick={submit}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
        >
          {creatingLogId === order.id ? "新增中..." : "新增照護紀錄"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {careLogs.length === 0 ? (
          <EmptyNote text="目前還沒有照護紀錄" />
        ) : (
          careLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#edf6fc] px-2.5 py-1 text-xs text-[#3f789f]">
                    {log.logType}
                  </span>
                  {!log.visibleToCustomer && (
                    <span className="rounded-full bg-[#fff8e8] px-2.5 py-1 text-xs text-[#a97922]">
                      內部
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#202124]">
                {log.message}
              </p>
              {log.photoUrl && (
                <a
                  href={log.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex rounded-full bg-[#faf7f4] px-3 py-1.5 text-xs text-[#6b3a2a] hover:bg-[#f3e4d7]"
                >
                  查看照片
                </a>
              )}
              <p className="mt-2 text-xs text-gray-500">
                記錄人：{log.authorName}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-[#fff8e8] p-2 text-[#a97922]">
          <History className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">操作紀錄</p>
          <h3 className="text-lg text-[#202124]">{logs.length} 筆異動</h3>
        </div>
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <EmptyNote text="目前還沒有店務操作紀錄" />
        ) : (
          logs.slice(0, 8).map((log) => (
            <div key={log.id} className="rounded-lg bg-[#f7f8fa] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#202124]">{log.action}</p>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {log.detail}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                操作人：{log.actorName}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function AssignmentEditor({
  order,
  assigningId,
  options,
  onSave,
}: {
  order: Order;
  assigningId: string | null;
  options: AssignmentOptions;
  onSave: (
    id: string,
    payload: {
      assignedSpot: string;
      scheduledTime: string;
      assignmentNote: string;
    }
  ) => void;
}) {
  const [assignedSpot, setAssignedSpot] = useState(order.assignedSpot || "");
  const [scheduledTime, setScheduledTime] = useState(order.scheduledTime || "");
  const [assignmentNote, setAssignmentNote] = useState(
    order.assignmentNote || ""
  );

  useEffect(() => {
    setAssignedSpot(order.assignedSpot || "");
    setScheduledTime(order.scheduledTime || "");
    setAssignmentNote(order.assignmentNote || "");
  }, [order.id, order.assignedSpot, order.scheduledTime, order.assignmentNote]);

  const isAccommodation = order.serviceType === "accommodation";
  const spotOptions = isAccommodation
    ? options.roomSpots[(order.roomType || "standard") as RoomType] || []
    : options.groomingStations;

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">位置安排</p>
          <h3 className="text-lg text-[#202124]">{assignmentSummary(order)}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            isOrderAssigned(order)
              ? "bg-[#eef7ef] text-[#4f7f55]"
              : "bg-[#fff8e8] text-[#a97922]"
          }`}
        >
          {isOrderAssigned(order) ? "已安排" : "未安排"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-gray-500">
            {isAccommodation ? "房位" : "美容台"}
          </span>
          <select
            value={assignedSpot}
            onChange={(event) => setAssignedSpot(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          >
            <option value="">尚未安排</option>
            {spotOptions.map((spot) => (
              <option key={spot} value={spot}>
                {spot}
              </option>
            ))}
          </select>
        </label>

        {isAccommodation ? (
          <DetailItem label="入住期間" value={dateRange(order)} />
        ) : (
          <label className="block">
            <span className="text-xs text-gray-500">美容時段</span>
            <select
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
            >
              <option value="">尚未安排</option>
              {options.groomingTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="mt-3 block">
        <span className="text-xs text-gray-500">安排備註</span>
        <textarea
          value={assignmentNote}
          onChange={(event) => setAssignmentNote(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
          placeholder="例如：靠窗、需安靜位置、先洗澡再修剪"
        />
      </label>

      <button
        type="button"
        disabled={assigningId === order.id}
        onClick={() =>
          onSave(order.id, {
            assignedSpot,
            scheduledTime: isAccommodation ? "" : scheduledTime,
            assignmentNote,
          })
        }
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#202124] px-4 py-2.5 text-sm text-white hover:bg-[#34373b] disabled:opacity-60"
      >
        {assigningId === order.id ? "儲存中..." : "儲存安排"}
      </button>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f7f8fa] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-[#202124]">{value}</p>
    </div>
  );
}

function serviceName(order: Order) {
  if (order.serviceType === "accommodation") {
    return order.roomType ? roomNames[order.roomType] : "住宿服務";
  }

  return order.groomingService
    ? groomingNames[order.groomingService]
    : "美容服務";
}

function dateRange(order: Order) {
  return order.endDate ? `${order.startDate} - ${order.endDate}` : order.startDate;
}

function isStayingOnDate(order: Order, date: string) {
  return (
    order.serviceType === "accommodation" &&
    order.status !== "已取消" &&
    Boolean(order.endDate) &&
    order.startDate <= date &&
    String(order.endDate) > date
  );
}

function isOrderRelevantToDate(order: Order, date: string) {
  if (!date || order.status === "已取消") {
    return false;
  }

  if (order.serviceType === "grooming") {
    return order.startDate === date;
  }

  return (
    order.startDate === date ||
    order.endDate === date ||
    isStayingOnDate(order, date)
  );
}

function isOrderAssigned(order: Order) {
  if (order.serviceType === "accommodation") {
    return Boolean(order.assignedSpot);
  }

  return Boolean(order.assignedSpot && order.scheduledTime);
}

function assignmentSummary(order: Order) {
  if (order.serviceType === "accommodation") {
    return order.assignedSpot ? `房位 ${order.assignedSpot}` : "尚未安排房位";
  }

  if (order.assignedSpot && order.scheduledTime) {
    return `${order.assignedSpot} / ${order.scheduledTime}`;
  }

  if (order.scheduledTime) {
    return `美容時段 ${order.scheduledTime}，尚未安排美容台`;
  }

  return "尚未安排美容台";
}

function assignmentHint(order: Order) {
  return order.serviceType === "accommodation"
    ? "請指定住宿房位"
    : order.scheduledTime
    ? "請指定美容台"
    : "請指定美容台與時段";
}

function listToInput(values: string[]) {
  return values.join("\n");
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function formatAttendanceTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAttendanceMinutes(minutes: number) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

function inputToList(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function petIcon(species: string) {
  if (species === "狗") return "🐕";
  if (species === "貓") return "🐈";
  return "🐾";
}

function paymentBadge(status: string) {
  if (status === "已付款") return "bg-[#eef7ef] text-[#4f7f55]";
  if (status === "已付訂金") return "bg-[#fff8e8] text-[#a97922]";
  return "bg-[#fff0f0] text-[#b85c68]";
}

function paymentSummary(order: Order) {
  const paidAmount = order.paidAmount || 0;
  const balanceDue = order.balanceDue ?? Math.max(0, order.total - paidAmount);
  const method = order.paymentMethod ? ` / ${order.paymentMethod}` : "";

  if (order.paymentStatus === "已付款") {
    return `已收 NT$ ${order.total.toLocaleString()}${method}`;
  }

  if (order.paymentStatus === "已付訂金") {
    return `已收 NT$ ${paidAmount.toLocaleString()}，尾款 NT$ ${balanceDue.toLocaleString()}${method}`;
  }

  return `未付款 / NT$ ${order.total.toLocaleString()}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    待確認: "bg-[#fff8f2] text-[#b87868]",
    已確認: "bg-[#edf6fc] text-[#3f789f]",
    進行中: "bg-[#f5efe9] text-[#6b3a2a]",
    已完成: "bg-[#eef7ef] text-[#4f7f55]",
    已取消: "bg-[#fff0f0] text-[#b85c68]",
  };

  return map[status] || "bg-gray-100 text-gray-600";
}

function toneBadge(tone: "blue" | "green" | "rose" | "gold" | "brown") {
  const map = {
    blue: "bg-[#edf6fc] text-[#3f789f]",
    green: "bg-[#eef7ef] text-[#4f7f55]",
    rose: "bg-[#fff0f0] text-[#b85c68]",
    gold: "bg-[#fff8e8] text-[#a97922]",
    brown: "bg-[#f5efe9] text-[#6b3a2a]",
  };

  return map[tone];
}

function statusSelectClass(status: string) {
  const map: Record<string, string> = {
    待確認: "border-[#f3d6c9] bg-[#fff8f2] text-[#b87868]",
    已確認: "border-[#d7e8f3] bg-[#f7fbff] text-[#477fa6]",
    進行中: "border-[#eadfd8] bg-[#f5efe9] text-[#6b3a2a]",
    已完成: "border-[#d9ead9] bg-[#f3f7f3] text-[#5f8a5f]",
    已取消: "border-[#f1d5d5] bg-[#fff0f0] text-[#b85c68]",
  };

  return map[status] || "border-gray-200 bg-white text-gray-700";
}
