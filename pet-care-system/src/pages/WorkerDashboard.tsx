import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Home,
  MessageSquare,
  RefreshCcw,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";
import { useAuth } from "../contexts/AuthContext";

type CareLog = {
  id: string;
  authorName: string;
  logType: string;
  message: string;
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
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
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
      const data = await api(`/worker/schedule?date=${selectedDate}`);
      setOrders(data.orders || []);
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
      active: orders.filter((order) => order.status === "進行中").length,
      abnormal: orders.reduce(
        (count, order) =>
          count + (order.careLogs || []).filter((log) => log.logType === "異常").length,
        0
      ),
    };
  }, [orders]);

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
    message: string
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard icon={<ClipboardList />} label="今日排程" value={summary.total} />
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
        ) : orders.length === 0 ? (
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
                onCreateStructuredLog={(logType, message) =>
                  createTypedCareLog(order.id, logType, message)
                }
              />
            ))}
          </div>
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
  onCreateStructuredLog: (logType: string, message: string) => void;
}) {
  const title =
    order.serviceType === "accommodation"
      ? roomNames[order.roomType || "standard"]
      : groomingNames[order.groomingService || "basic"];
  const latestLogs = order.careLogs || [];

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-4 flex items-start justify-between gap-4">
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
              </div>
            </div>
            <span className="rounded-full bg-[#f7fbff] px-3 py-1 text-xs text-[#477fa6]">
              {order.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="服務日期" value={dateRange(order)} />
            <Info label="位置 / 時段" value={assignmentSummary(order)} />
            <Info label="毛孩資訊" value={petSummary(order)} />
            <Info label="店務備註" value={order.assignmentNote || order.notes || "無"} />
          </div>

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
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
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
  onCreateLog: (logType: string, message: string) => void;
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
      care.photo ? `照片紀錄：${care.photo}` : "",
    ]
      .filter(Boolean)
      .join("；");

    onCreateLog("每日照護表", message);
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

function petSummary(order: WorkOrder) {
  const pet = order.pet;
  if (!pet) return order.petName || "未提供";

  return [
    pet.name,
    pet.species,
    pet.breed,
    pet.weight ? `${pet.weight}kg` : "",
    pet.notes ? `備註：${pet.notes}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}
