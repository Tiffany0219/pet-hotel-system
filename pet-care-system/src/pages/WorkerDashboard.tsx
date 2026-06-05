import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  HeartPulse,
  Home,
  ListChecks,
  MessageSquare,
  Phone,
  RefreshCcw,
  Scissors,
  ShieldCheck,
  UserRound,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";
import { useAuth } from "../contexts/AuthContext";

type CareLog = {
  id: string;
  authorName: string;
  logType: string;
  message: string;
  photoUrl?: string;
  visibleToCustomer: boolean;
  createdAt: string;
};

type WorkOrder = {
  id: string;
  userName: string;
  userPhone: string;
  petName: string;
  pet?: {
    name: string;
    species: string;
    breed: string;
    age?: number;
    weight?: number;
    notes?: string;
    allergies?: string;
    medicalNotes?: string;
    vaccineDate?: string;
    vetName?: string;
    vetPhone?: string;
    emergencyContact?: string;
  } | null;
  serviceType: "accommodation" | "grooming";
  roomType?: "standard" | "deluxe" | "vip";
  groomingService?: "basic" | "styling" | "spa";
  startDate: string;
  endDate?: string | null;
  assignedSpot?: string | null;
  scheduledTime?: string | null;
  assignmentNote?: string;
  status: string;
  notes?: string;
  careLogs?: CareLog[];
};

type StaffShift = {
  id: string;
  userName: string;
  workDate: string;
  shiftLabel: string;
  roleLabel: string;
  note: string;
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

const roleLabels: Record<string, string> = {
  staff: "店務人員",
  admin: "系統管理員",
  groomer: "美容師",
  caregiver: "寵物照護師",
};

const roomNames = {
  standard: "豪華單人房",
  deluxe: "舒適雙人房",
  vip: "VIP 總統套房",
};

const groomingNames = {
  basic: "基礎洗澡護理",
  styling: "造型剪毛設計",
  spa: "SPA 深層護理",
};

export default function WorkerDashboard() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [messageByOrder, setMessageByOrder] = useState<Record<string, string>>({});
  const [logTypeByOrder, setLogTypeByOrder] = useState<Record<string, string>>({});

  async function api(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
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
      throw new Error(data.message || "操作失敗");
    }

    return data;
  }

  async function loadSchedule(showToast = false) {
    try {
      setLoading(true);
      const [scheduleData, attendanceData] = await Promise.all([
        api(`/worker/schedule?date=${selectedDate}`),
        api("/staff/attendance/today"),
      ]);
      setOrders(scheduleData.orders || []);
      setShifts(scheduleData.shifts || []);
      setAttendance(attendanceData.attendance || null);
      if (showToast) toast.success("排程已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "讀取排程失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const summary = useMemo(() => {
    return {
      total: orders.length,
      shifts: shifts.length,
      active: orders.filter((order) => order.status === "進行中").length,
      pending: orders.filter((order) => order.status === "待確認" || order.status === "已確認").length,
      completed: orders.filter((order) => order.status === "已完成").length,
      abnormal: orders.reduce(
        (count, order) =>
          count + (order.careLogs || []).filter((log) => log.logType === "異常").length,
        0
      ),
    };
  }, [orders, shifts.length]);

  async function updateStatus(orderId: string, status: string) {
    try {
      setSavingId(orderId);
      await api(`/worker/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("狀態已更新");
      await loadSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新狀態失敗");
    } finally {
      setSavingId(null);
    }
  }

  async function createCareLog(orderId: string) {
    const message = (messageByOrder[orderId] || "").trim();
    const logType = logTypeByOrder[orderId] || "照護";

    if (!message) {
      toast.error("請輸入紀錄內容");
      return;
    }

    try {
      setSavingId(orderId);
      const data = await api(`/worker/orders/${orderId}/care-logs`, {
        method: "POST",
        body: JSON.stringify({
          logType,
          message,
          visibleToCustomer: true,
        }),
      });
      toast.success(data.message || "照護紀錄已新增");
      setMessageByOrder((current) => ({ ...current, [orderId]: "" }));
      setLogTypeByOrder((current) => ({ ...current, [orderId]: "照護" }));
      await loadSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增紀錄失敗");
    } finally {
      setSavingId(null);
    }
  }

  async function createTypedCareLog(
    orderId: string,
    logType: string,
    message: string,
    photoUrl = ""
  ) {
    if (!message.trim()) {
      toast.error("請先填寫紀錄內容");
      return;
    }

    try {
      setSavingId(orderId);
      const data = await api(`/worker/orders/${orderId}/care-logs`, {
        method: "POST",
        body: JSON.stringify({
          logType,
          message,
          photoUrl,
          visibleToCustomer: true,
        }),
      });
      toast.success(data.message || "紀錄已新增");
      await loadSchedule();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增紀錄失敗");
    } finally {
      setSavingId(null);
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

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="border-b border-[#f0e6df] bg-[#faf7f4]">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-[#b87868]">WORK SCHEDULE</p>
              <h1 className="mt-2 text-4xl text-[#3d1a0d]">照護工作排程</h1>
              <p className="mt-2 text-sm text-gray-600">
                {roleLabels[user?.role || ""] || "工作人員"}可以查看今日服務、更新狀態，並在異常時通知家長。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AttendanceCard
                compact
                attendance={attendance}
                saving={attendanceSaving}
                onClockIn={() => updateAttendance("clock-in")}
                onClockOut={() => updateAttendance("clock-out")}
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="rounded-lg border border-[#eadfd8] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#c8a97e]"
              />
              <button
                type="button"
                onClick={() => loadSchedule(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6b3a2a] px-4 py-2.5 text-sm text-white hover:bg-[#8b5040]"
              >
                <RefreshCcw className="h-4 w-4" />
                重新整理
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <SummaryCard icon={<ClipboardList />} label="今日排程" value={summary.total} />
            <SummaryCard icon={<CalendarDays />} label="今日班別" value={summary.shifts} />
            <SummaryCard icon={<CheckCircle2 />} label="進行中" value={summary.active} />
            <SummaryCard icon={<AlertTriangle />} label="異常紀錄" value={summary.abnormal} tone="rose" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            正在讀取排程...
          </div>
        ) : (
          <>
            <WorkdayCommandCenter
              role={user?.role || ""}
              selectedDate={selectedDate}
              shifts={shifts}
              orders={orders}
              summary={summary}
            />

            {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-[#c8a97e]" />
            <h2 className="text-xl text-[#3d1a0d]">這天沒有排程</h2>
            <p className="mt-2 text-sm text-gray-500">店務人員安排房位或美容時段後，會出現在這裡。</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {orders.map((order) => (
              <WorkOrderCard
                key={order.id}
                order={order}
                saving={savingId === order.id}
                message={messageByOrder[order.id] || ""}
                logType={logTypeByOrder[order.id] || "照護"}
                onMessageChange={(value) =>
                  setMessageByOrder((current) => ({ ...current, [order.id]: value }))
                }
                onLogTypeChange={(value) =>
                  setLogTypeByOrder((current) => ({ ...current, [order.id]: value }))
                }
                onStatusChange={(status) => updateStatus(order.id, status)}
                onCreateLog={() => createCareLog(order.id)}
                onCreateStructuredLog={(logType, message, photoUrl) =>
                  createTypedCareLog(order.id, logType, message, photoUrl)
                }
              />
            ))}
          </div>
        )}
          </>
        )}
      </section>
    </div>
  );
}

function WorkOrderCard({
  order,
  saving,
  message,
  logType,
  onMessageChange,
  onLogTypeChange,
  onStatusChange,
  onCreateLog,
  onCreateStructuredLog,
}: {
  order: WorkOrder;
  saving: boolean;
  message: string;
  logType: string;
  onMessageChange: (value: string) => void;
  onLogTypeChange: (value: string) => void;
  onStatusChange: (status: string) => void;
  onCreateLog: () => void;
  onCreateStructuredLog: (logType: string, message: string, photoUrl?: string) => void;
}) {
  const title =
    order.serviceType === "accommodation"
      ? roomNames[order.roomType || "standard"]
      : groomingNames[order.groomingService || "basic"];
  const latestLogs = order.careLogs || [];
  const riskNotes = [order.pet?.notes, order.assignmentNote, order.notes]
    .filter(Boolean)
    .join(" / ");
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-gray-100 bg-[#fbfcfd] px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${statusBadge(order.status)}`}>
            {order.status}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 ring-1 ring-gray-200">
            {order.serviceType === "accommodation" ? "照護住宿" : "美容服務"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 ring-1 ring-gray-200">
            {assignmentSummary(order)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {order.scheduledTime || (order.serviceType === "accommodation" ? "住宿中" : "待排時段")}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            {expanded ? "收起" : "展開"}
            <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fdf0e0] text-[#6b3a2a]">
              {order.serviceType === "accommodation" ? <Home /> : <Scissors />}
            </div>
            <div>
              <h2 className="text-xl text-[#202124]">
                #{order.id} {title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {order.petName} / 家長：{order.userName} / {order.userPhone || "未提供電話"}
              </p>
              {latestLogs[0] && (
                <p className="mt-2 line-clamp-1 text-xs text-gray-500">
                  最新紀錄：{latestLogs[0].logType} / {latestLogs[0].message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["進行中", "已完成"].map((status) => (
              <button
                key={status}
                type="button"
                disabled={saving}
                onClick={() => onStatusChange(status)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  order.status === status
                    ? "border-[#202124] bg-[#202124] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                } disabled:opacity-60`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="服務日期" value={dateRange(order)} />
          <Info label="位置 / 時段" value={assignmentSummary(order)} />
          <Info label="毛孩資訊" value={petSummary(order)} />
          <Info label="家長聯絡" value={`${order.userName} / ${order.userPhone || "未提供"}`} />
        </div>

        {riskNotes ? <RiskNotice text={riskNotes} /> : null}
      </div>

      {expanded && (
        <div className="grid gap-5 border-t border-gray-100 p-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <ServiceChecklist order={order} latestLogs={latestLogs} />

            <div className="mt-4 flex flex-wrap gap-2">
              {["已確認", "進行中", "已完成"].map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => onStatusChange(status)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    order.status === status
                      ? "border-[#202124] bg-[#202124] text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  } disabled:opacity-60`}
                >
                  {status}
                </button>
              ))}
            </div>

            <StructuredWorkForm
              order={order}
              saving={saving}
              onCreateLog={onCreateStructuredLog}
            />
          </div>

          <div className="rounded-xl bg-[#f7f8fa] p-4">
            <QuickTemplateButtons
              order={order}
              saving={saving}
              onCreateLog={onCreateStructuredLog}
            />

            <div className="mb-3 flex items-center gap-2 text-[#202124]">
              <MessageSquare className="h-4 w-4" />
              <h3>新增照護 / 異常通知</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <select
                value={logType}
                onChange={(event) => onLogTypeChange(event.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="照護">照護</option>
                <option value="美容">美容</option>
                <option value="餵食">餵食</option>
                <option value="健康">健康</option>
                <option value="異常">異常</option>
              </select>
              <input
                value={message}
                onChange={(event) => onMessageChange(event.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder={logType === "異常" ? "例如：食慾偏低，已通知家長並持續觀察" : "輸入服務紀錄"}
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onCreateLog}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white disabled:opacity-60 ${
                logType === "異常"
                  ? "bg-[#b85c68] hover:bg-[#a34f5a]"
                  : "bg-[#202124] hover:bg-[#34373b]"
              }`}
            >
              {logType === "異常" ? <AlertTriangle className="h-4 w-4" /> : null}
              {saving ? "處理中..." : logType === "異常" ? "通知家長" : "新增紀錄"}
            </button>

            <div className="mt-4 space-y-2">
              {latestLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 ${
                    log.logType === "異常"
                      ? "border-[#f0c8ce] bg-[#fff4f5]"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-[#6b3a2a]">{log.logType}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.message}</p>
                  {log.photoUrl && (
                    <PhotoPreview photoUrl={log.photoUrl} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function WorkdayCommandCenter({
  role,
  selectedDate,
  shifts,
  orders,
  summary,
}: {
  role: string;
  selectedDate: string;
  shifts: StaffShift[];
  orders: WorkOrder[];
  summary: {
    total: number;
    shifts: number;
    active: number;
    pending: number;
    completed: number;
    abnormal: number;
  };
}) {
  const isGroomer = role === "groomer";
  const roleTitle = isGroomer ? "美容師工作台" : role === "caregiver" ? "寵物照護師工作台" : "工作人員工作台";
  const pendingOrders = orders.filter((order) => order.status !== "已完成");
  const nextOrder = [...pendingOrders].sort((a, b) => {
    const left = a.scheduledTime || (a.serviceType === "accommodation" ? "00:00" : "99:99");
    const right = b.scheduledTime || (b.serviceType === "accommodation" ? "00:00" : "99:99");
    return left.localeCompare(right);
  })[0];
  const focusItems = buildFocusItems(role, orders, summary);

  return (
    <section className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-[#b87868]">{roleTitle}</p>
            <h2 className="mt-1 text-2xl text-[#3d1a0d]">今日工作重點</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedDate} 的班別、待處理服務與需要回報家長的事項。
            </p>
          </div>
          <div className="rounded-xl bg-[#faf7f4] px-4 py-3">
            <p className="text-xs text-gray-500">完成進度</p>
            <p className="mt-1 text-xl text-[#3d1a0d]">
              {summary.completed} / {summary.total}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniWorkStat icon={<ListChecks />} label="待處理" value={summary.pending} />
          <MiniWorkStat icon={<Activity />} label="進行中" value={summary.active} />
          <MiniWorkStat icon={<AlertTriangle />} label="異常回報" value={summary.abnormal} tone="rose" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-[#f0e6df] bg-[#fffefe] p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#c8a97e]" />
              <h3 className="text-lg text-[#3d1a0d]">我的班表</h3>
            </div>
            <div className="mt-3 space-y-2">
              {shifts.length === 0 ? (
                <p className="rounded-lg bg-[#faf7f4] p-3 text-sm text-gray-500">
                  這天尚未安排你的班別。
                </p>
              ) : (
                shifts.map((shift) => (
                  <div key={shift.id} className="rounded-lg bg-[#faf7f4] p-3">
                    <p className="text-sm text-[#3d1a0d]">{shift.shiftLabel}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {shift.roleLabel} / {shift.workDate}
                    </p>
                    {shift.note && <p className="mt-2 text-sm text-gray-600">{shift.note}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#f0e6df] bg-[#fffefe] p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#c8a97e]" />
              <h3 className="text-lg text-[#3d1a0d]">下一筆服務</h3>
            </div>
            {nextOrder ? (
              <div className="mt-3 rounded-lg bg-[#faf7f4] p-3">
                <p className="text-sm text-[#3d1a0d]">
                  #{nextOrder.id} {nextOrder.petName}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {nextOrder.serviceType === "grooming" ? groomingNames[nextOrder.groomingService || "basic"] : roomNames[nextOrder.roomType || "standard"]}
                </p>
                <p className="mt-2 text-sm text-gray-600">{assignmentSummary(nextOrder)}</p>
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-[#faf7f4] p-3 text-sm text-gray-500">
                目前沒有下一筆待處理服務。
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#6b3a2a]" />
          <h3 className="text-xl text-[#3d1a0d]">工作提醒</h3>
        </div>
        <div className="mt-4 space-y-3">
          {focusItems.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-100 bg-[#fbfcfd] p-4">
              <p className="text-sm text-[#202124]">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AttendanceCard({
  attendance,
  saving,
  compact = false,
  onClockIn,
  onClockOut,
}: {
  attendance: Attendance | null;
  saving: boolean;
  compact?: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  const hasClockIn = Boolean(attendance?.clockInAt);
  const hasClockOut = Boolean(attendance?.clockOutAt);

  return (
    <div
      className={`rounded-xl border border-[#eadfd8] bg-white shadow-sm ${
        compact ? "min-w-[260px] px-4 py-3" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">今日打卡</p>
          <p className="mt-1 text-sm text-[#3d1a0d]">
            {hasClockOut ? "已完成下班打卡" : hasClockIn ? "上班中" : "尚未上班打卡"}
          </p>
        </div>
        <Clock className="h-5 w-5 text-[#c8a97e]" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <AttendanceMini label="上班" value={formatTime(attendance?.clockInAt)} />
        <AttendanceMini label="下班" value={formatTime(attendance?.clockOutAt)} />
        <AttendanceMini label="工時" value={formatMinutes(attendance?.workedMinutes || 0)} />
      </div>

      <div className="mt-3 flex gap-2">
        {!hasClockIn ? (
          <button
            type="button"
            disabled={saving}
            onClick={onClockIn}
            className="flex-1 rounded-lg bg-[#6b3a2a] px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            上班打卡
          </button>
        ) : !hasClockOut ? (
          <button
            type="button"
            disabled={saving}
            onClick={onClockOut}
            className="flex-1 rounded-lg bg-[#202124] px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            下班打卡
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-[#eef7ef] px-3 py-2 text-sm text-[#4f7f55]"
          >
            今日已完成
          </button>
        )}
      </div>
    </div>
  );
}

function AttendanceMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#faf7f4] px-2 py-2 text-center">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 text-xs text-[#202124]">{value}</p>
    </div>
  );
}

function MiniWorkStat({
  icon,
  label,
  value,
  tone = "brown",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "brown" | "rose";
}) {
  return (
    <div className="rounded-xl bg-[#faf7f4] p-4">
      <div className={tone === "rose" ? "text-[#b85c68]" : "text-[#6b3a2a]"}>
        {icon}
      </div>
      <p className="mt-3 text-xs text-gray-500">{label}</p>
      <p className="text-2xl text-[#202124]">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone = "brown",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "brown" | "rose";
}) {
  return (
    <div className="rounded-xl border border-[#eadfd8] bg-white p-4 shadow-sm">
      <div className={tone === "rose" ? "text-[#b85c68]" : "text-[#6b3a2a]"}>
        {icon}
      </div>
      <p className="mt-3 text-sm text-gray-500">{label}</p>
      <p className="text-2xl text-[#202124]">{value}</p>
    </div>
  );
}

function StructuredWorkForm({
  order,
  saving,
  onCreateLog,
}: {
  order: WorkOrder;
  saving: boolean;
  onCreateLog: (logType: string, message: string, photoUrl?: string) => void;
}) {
  const [care, setCare] = useState({
    feeding: "",
    water: "",
    walk: "",
    toilet: "",
    mood: "",
    medicine: "",
    photo: "",
  });
  const [grooming, setGrooming] = useState({
    before: "",
    skin: "",
    coat: "",
    matting: "",
    after: "",
  });

  const submitCare = () => {
    const message = [
      `餵食：${care.feeding || "未填"}`,
      `喝水：${care.water || "未填"}`,
      `散步：${care.walk || "未填"}`,
      `排泄：${care.toilet || "未填"}`,
      `精神狀態：${care.mood || "未填"}`,
      `用藥：${care.medicine || "無"}`,
    ]
      .filter(Boolean)
      .join("；");

    onCreateLog("每日照護表", message, care.photo.trim());
    setCare({
      feeding: "",
      water: "",
      walk: "",
      toilet: "",
      mood: "",
      medicine: "",
      photo: "",
    });
  };

  const submitGrooming = () => {
    const message = [
      `美容前狀況：${grooming.before || "未填"}`,
      `皮膚狀況：${grooming.skin || "未填"}`,
      `毛量/打結：${grooming.coat || "未填"} / ${grooming.matting || "未填"}`,
      `美容完成備註：${grooming.after || "未填"}`,
    ].join("；");

    onCreateLog("美容工作紀錄", message);
    setGrooming({
      before: "",
      skin: "",
      coat: "",
      matting: "",
      after: "",
    });
  };

  if (order.serviceType === "grooming") {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm text-[#202124]">美容師工作紀錄</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SmallInput label="美容前備註" value={grooming.before} onChange={(value) => setGrooming((current) => ({ ...current, before: value }))} />
          <SmallInput label="皮膚狀況" value={grooming.skin} onChange={(value) => setGrooming((current) => ({ ...current, skin: value }))} />
          <SmallInput label="毛量狀況" value={grooming.coat} onChange={(value) => setGrooming((current) => ({ ...current, coat: value }))} />
          <SmallInput label="打結狀況" value={grooming.matting} onChange={(value) => setGrooming((current) => ({ ...current, matting: value }))} />
        </div>
        <SmallInput label="美容完成備註" value={grooming.after} onChange={(value) => setGrooming((current) => ({ ...current, after: value }))} />
        <button
          type="button"
          disabled={saving}
          onClick={submitGrooming}
          className="mt-3 rounded-lg bg-[#6b3a2a] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          儲存美容工作紀錄
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm text-[#202124]">每日照護表</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SmallInput label="餵食" value={care.feeding} onChange={(value) => setCare((current) => ({ ...current, feeding: value }))} />
        <SmallInput label="喝水" value={care.water} onChange={(value) => setCare((current) => ({ ...current, water: value }))} />
        <SmallInput label="散步" value={care.walk} onChange={(value) => setCare((current) => ({ ...current, walk: value }))} />
        <SmallInput label="排泄" value={care.toilet} onChange={(value) => setCare((current) => ({ ...current, toilet: value }))} />
        <SmallInput label="精神狀態" value={care.mood} onChange={(value) => setCare((current) => ({ ...current, mood: value }))} />
        <SmallInput label="用藥" value={care.medicine} onChange={(value) => setCare((current) => ({ ...current, medicine: value }))} />
      </div>
      <SmallInput label="照片紀錄連結" value={care.photo} onChange={(value) => setCare((current) => ({ ...current, photo: value }))} />
      <button
        type="button"
        disabled={saving}
        onClick={submitCare}
        className="mt-3 rounded-lg bg-[#6b3a2a] px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        儲存每日照護表
      </button>
    </div>
  );
}

function QuickTemplateButtons({
  order,
  saving,
  onCreateLog,
}: {
  order: WorkOrder;
  saving: boolean;
  onCreateLog: (logType: string, message: string, photoUrl?: string) => void;
}) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lastPhotoName, setLastPhotoName] = useState("");
  const canUploadCompletionPhoto = order.status === "已完成";
  const templates =
    order.serviceType === "grooming"
      ? [
          {
            icon: <Scissors className="h-4 w-4" />,
            label: "美容開始",
            type: "美容",
            message: `${order.petName} 已開始美容服務，會依照預約項目進行。`,
          },
          {
            icon: <HeartPulse className="h-4 w-4" />,
            label: "皮膚提醒",
            type: "異常",
            message: `${order.petName} 美容時發現皮膚狀況需留意，已通知家長並建議後續觀察。`,
          },
        ]
      : [
          {
            icon: <Utensils className="h-4 w-4" />,
            label: "餵食完成",
            type: "餵食",
            message: `${order.petName} 已完成餵食與喝水，狀況穩定。`,
          },
          {
            icon: <Activity className="h-4 w-4" />,
            label: "活動排泄",
            type: "照護",
            message: `${order.petName} 已完成活動與排泄紀錄，精神狀態正常。`,
          },
          {
            icon: <AlertTriangle className="h-4 w-4" />,
            label: "異常通知",
            type: "異常",
            message: `${order.petName} 今日狀況需留意，已通知家長並持續觀察。`,
          },
        ];

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("圖片請控制在 3MB 以內");
      return;
    }

    try {
      setUploadingPhoto(true);
      const photoDataUrl = await readFileAsDataUrl(file);
      const logType = order.serviceType === "grooming" ? "美容照片" : "照護照片";
      const message =
        order.serviceType === "grooming"
          ? `${order.petName} 美容已完成，照片已上傳給家長查看。`
          : `${order.petName} 今日照護照片已上傳給家長查看。`;

      onCreateLog(logType, message, photoDataUrl);
      setLastPhotoName(file.name);
    } catch (error) {
      toast.error("照片讀取失敗，請重新選擇");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-[#202124]">
        <FileText className="h-4 w-4" />
        <h3>快速回報</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            saving || uploadingPhoto || !canUploadCompletionPhoto
              ? "pointer-events-none opacity-60"
              : "border-[#d9c5b8] bg-[#fffaf6] text-[#6b3a2a] hover:bg-[#fdf0e0]"
          }`}
        >
          <Camera className="h-4 w-4" />
          {uploadingPhoto ? "上傳中..." : "完成照片上傳"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={saving || uploadingPhoto || !canUploadCompletionPhoto}
            onChange={(event) => {
              handlePhotoUpload(event.target.files?.[0] || null);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {templates.map((template) => (
          <button
            key={template.label}
            type="button"
            disabled={saving}
            onClick={() => onCreateLog(template.type, template.message)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-60 ${
              template.type === "異常"
                ? "border-[#f0c8ce] bg-[#fff4f5] text-[#b85c68] hover:bg-[#ffe9ec]"
                : "border-gray-200 bg-white text-gray-600 hover:bg-[#faf7f4]"
            }`}
          >
            {template.icon}
            {template.label}
          </button>
        ))}
      </div>
      {lastPhotoName && (
        <p className="mt-2 text-xs text-gray-500">
          已上傳：{lastPhotoName}，家長端會收到照片完成通知。
        </p>
      )}
      {!canUploadCompletionPhoto && (
        <p className="mt-2 text-xs text-gray-500">
          請先將訂單狀態改為「已完成」，再上傳完成照片給家長查看。
        </p>
      )}
    </div>
  );
}

function ServiceChecklist({
  order,
  latestLogs,
}: {
  order: WorkOrder;
  latestLogs: CareLog[];
}) {
  const steps =
    order.serviceType === "grooming"
      ? [
          { label: "接單確認", done: ["已確認", "進行中", "已完成"].includes(order.status) },
          { label: "美容前檢查", done: latestLogs.some((log) => log.logType.includes("美容")) },
          { label: "服務完成", done: order.status === "已完成" },
          { label: "家長可見回報", done: latestLogs.some((log) => log.visibleToCustomer) },
        ]
      : [
          { label: "入住/照護確認", done: ["進行中", "已完成"].includes(order.status) },
          { label: "餵食喝水紀錄", done: latestLogs.some((log) => log.logType === "餵食" || log.message.includes("餵食")) },
          { label: "活動排泄紀錄", done: latestLogs.some((log) => log.message.includes("排泄") || log.message.includes("散步")) },
          { label: "家長可見回報", done: latestLogs.some((log) => log.visibleToCustomer) },
        ];

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-[#fffefe] p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-[#6b3a2a]" />
        <h3 className="text-sm text-[#202124]">
          {order.serviceType === "grooming" ? "美容流程" : "照護流程"}
        </h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              step.done ? "bg-[#eef7ef] text-[#4f7f55]" : "bg-[#faf7f4] text-gray-500"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskNotice({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-[#f0d98d] bg-[#fff8e8] p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#a97922]" />
        <div>
          <p className="text-sm text-[#202124]">服務注意事項</p>
          <p className="mt-1 text-sm leading-relaxed text-[#7a5a12]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function PhotoPreview({ photoUrl }: { photoUrl: string }) {
  const isInlineImage = photoUrl.startsWith("data:image/");

  return (
    <div className="mt-3">
      {isInlineImage && (
        <img
          src={photoUrl}
          alt="服務照片"
          className="mb-2 h-32 w-full rounded-lg object-cover"
        />
      )}
      <a
        href={photoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-full bg-[#faf7f4] px-3 py-1.5 text-xs text-[#6b3a2a] hover:bg-[#f3e4d7]"
      >
        查看照片
      </a>
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6f9fc2]"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#fbfcfd] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-[#202124]">{value}</p>
    </div>
  );
}

function dateRange(order: WorkOrder) {
  return order.endDate ? `${order.startDate} - ${order.endDate}` : order.startDate;
}

function assignmentSummary(order: WorkOrder) {
  if (order.serviceType === "accommodation") {
    return order.assignedSpot ? `房位 ${order.assignedSpot}` : "尚未安排房位";
  }

  return order.assignedSpot && order.scheduledTime
    ? `${order.assignedSpot} / ${order.scheduledTime}`
    : order.scheduledTime
    ? `美容時段 ${order.scheduledTime}，尚未安排美容台`
    : "尚未安排美容台與時段";
}

function buildFocusItems(
  role: string,
  orders: WorkOrder[],
  summary: {
    total: number;
    shifts: number;
    active: number;
    pending: number;
    completed: number;
    abnormal: number;
  }
) {
  const hasRisk = orders.some((order) =>
    [order.pet?.notes, order.assignmentNote, order.notes].filter(Boolean).join("").trim()
  );

  const baseItems = [
    {
      title: "先確認狀態",
      text: `目前有 ${summary.pending} 筆待處理、${summary.active} 筆進行中。開始服務前先把狀態改成「進行中」。`,
    },
    {
      title: "服務後要留下紀錄",
      text: "完成餵食、活動、美容或照護後，使用快速回報或表單留下可給家長看的紀錄。",
    },
  ];

  const roleItem =
    role === "groomer"
      ? {
          title: "美容重點",
          text: "美容前先檢查皮膚、毛結與特殊備註；若有紅腫、傷口或抗拒，請用異常通知家長。",
        }
      : {
          title: "照護重點",
          text: "住宿照護請確認餵食、喝水、排泄、活動與精神狀態，特殊用藥要寫在每日照護表。",
        };

  const riskItem = hasRisk
    ? {
        title: "有特殊備註",
        text: "今天的服務裡有毛孩備註或店務提醒，請打開卡片內的服務注意事項確認。",
      }
    : {
        title: "目前無特殊風險",
        text: "今天排程沒有明顯特殊備註；服務過程若發現異常，仍要即時回報。",
      };

  return [...baseItems, roleItem, riskItem];
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    待確認: "bg-[#fff8e8] text-[#a97922]",
    已確認: "bg-[#edf6fc] text-[#3f789f]",
    待會員確認: "bg-[#fff8e8] text-[#a97922]",
    進行中: "bg-[#fdf0e0] text-[#6b3a2a]",
    已完成: "bg-[#eef7ef] text-[#4f7f55]",
    已取消: "bg-[#fff0f0] text-[#b85c68]",
  };

  return map[status] || "bg-gray-100 text-gray-500";
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(minutes: number) {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function petSummary(order: WorkOrder) {
  const pet = order.pet;
  if (!pet) return order.petName || "未提供";

  return [
    pet.name,
    pet.species,
    pet.breed,
    pet.weight ? `${pet.weight}kg` : "",
    pet.notes ? `備註：${pet.notes}` : "",
    pet.allergies ? `過敏：${pet.allergies}` : "",
    pet.medicalNotes ? `照護：${pet.medicalNotes}` : "",
    pet.emergencyContact ? `緊急聯絡：${pet.emergencyContact}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}
