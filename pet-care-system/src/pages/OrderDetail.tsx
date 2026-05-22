import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Home,
  Image,
  MessageSquare,
  PawPrint,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";

type CareLog = {
  id: string;
  authorName: string;
  logType: string;
  message: string;
  photoUrl?: string;
  createdAt: string;
};

type Order = {
  id: string;
  petName?: string;
  pet?: {
    name: string;
    species: string;
    breed: string;
    age: number;
    weight: number;
    gender: string;
    notes: string;
    imageUrl?: string;
  } | null;
  serviceType: "accommodation" | "grooming";
  roomType?: "standard" | "deluxe" | "vip" | null;
  groomingService?: "basic" | "styling" | "spa" | null;
  startDate: string;
  endDate?: string | null;
  assignedSpot?: string | null;
  scheduledTime?: string | null;
  assignmentNote?: string;
  cancelReason?: string;
  total: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount?: number;
  balanceDue?: number;
  status: string;
  notes?: string;
  careLogs?: CareLog[];
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

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/orders/${id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.message || "讀取訂單失敗");
          navigate("/orders");
          return;
        }

        setOrder(data.order);
      } catch (error) {
        console.error(error);
        toast.error("讀取訂單失敗");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffefe] flex items-center justify-center">
        <p className="text-[#6b3a2a]">正在讀取訂單詳情...</p>
      </div>
    );
  }

  if (!order) return null;

  const serviceName =
    order.serviceType === "accommodation"
      ? roomNames[order.roomType || "standard"]
      : groomingNames[order.groomingService || "basic"];
  const careLogs = order.careLogs || [];

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="border-b border-[#f0e6df] bg-[#faf7f4]">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm text-[#6b3a2a] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            回到我的訂單
          </Link>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-[#b87868]">ORDER DETAIL</p>
              <h1 className="mt-2 text-4xl text-[#3d1a0d]">
                訂單 #{order.id}
              </h1>
              <p className="mt-2 text-gray-600">
                {serviceName} / {order.petName || order.pet?.name || "毛孩"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{order.status}</Badge>
              <Badge>{order.paymentStatus}</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel title="服務資訊" icon={<CalendarDays />}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="服務項目" value={serviceName} />
              <Info
                label="日期"
                value={order.endDate ? `${order.startDate} - ${order.endDate}` : order.startDate}
              />
              <Info label="位置 / 時段" value={assignmentSummary(order)} />
              <Info label="店務備註" value={order.assignmentNote || "無"} />
              <Info label="會員備註" value={order.notes || "無"} />
              <Info label="取消原因" value={order.cancelReason || "無"} />
            </div>
          </Panel>

          <Panel title="付款資訊" icon={<CreditCard />}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="總金額" value={`NT$ ${order.total.toLocaleString()}`} />
              <Info label="已收金額" value={`NT$ ${(order.paidAmount || 0).toLocaleString()}`} />
              <Info label="付款方式" value={order.paymentMethod || "未付款"} />
            </div>
          </Panel>

          <Panel title="照護與通知紀錄" icon={<MessageSquare />}>
            {careLogs.length === 0 ? (
              <p className="text-sm text-gray-500">目前還沒有照護紀錄。</p>
            ) : (
              <div className="space-y-3">
                {careLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-[#f0e6df] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#edf6fc] px-3 py-1 text-xs text-[#3f789f]">
                        {log.logType}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {log.message}
                    </p>
                    {log.photoUrl && (
                      <CareLogPhoto photoUrl={log.photoUrl} />
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      記錄人：{log.authorName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="寵物資料" icon={<PawPrint />}>
            {order.pet?.imageUrl && (
              <img
                src={order.pet.imageUrl}
                alt={order.pet.name}
                className="mb-4 h-48 w-full rounded-2xl object-cover"
              />
            )}
            <div className="grid gap-3">
              <Info label="姓名" value={order.pet?.name || order.petName || "未提供"} />
              <Info label="種類 / 品種" value={`${order.pet?.species || "-"} / ${order.pet?.breed || "-"}`} />
              <Info label="年齡 / 體重" value={`${order.pet?.age || "-"} 歲 / ${order.pet?.weight || "-"} kg`} />
              <Info label="性別" value={order.pet?.gender || "-"} />
              <Info label="照護備註" value={order.pet?.notes || "無"} />
            </div>
          </Panel>

          <Panel
            title={order.serviceType === "accommodation" ? "住宿服務" : "美容服務"}
            icon={order.serviceType === "accommodation" ? <Home /> : <Scissors />}
          >
            <p className="text-sm leading-relaxed text-gray-600">
              店務人員會依訂單狀態、照護紀錄與付款資料進行後續服務安排。
            </p>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#f0e6df] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf0e0] text-[#6b3a2a]">
          {icon}
        </div>
        <h2 className="text-xl text-[#3d1a0d]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf7f4] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#3d1a0d]">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-4 py-2 text-sm text-[#6b3a2a] shadow-sm">
      {children}
    </span>
  );
}

function CareLogPhoto({ photoUrl }: { photoUrl: string }) {
  const isInlineImage = photoUrl.startsWith("data:image/");

  return (
    <div className="mt-3">
      {isInlineImage && (
        <img
          src={photoUrl}
          alt="服務照片"
          className="mb-2 h-44 w-full rounded-2xl object-cover"
        />
      )}
      <a
        href={photoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#faf7f4] px-3 py-2 text-xs text-[#6b3a2a] hover:bg-[#f3e4d7]"
      >
        <Image className="h-3.5 w-3.5" />
        查看照片
      </a>
    </div>
  );
}

function assignmentSummary(order: Order) {
  if (order.serviceType === "accommodation") {
    return order.assignedSpot ? `房位 ${order.assignedSpot}` : "店家尚未安排房位";
  }

  if (order.assignedSpot && order.scheduledTime) {
    return `${order.assignedSpot} / ${order.scheduledTime}`;
  }

  if (order.scheduledTime) {
    return `美容時段 ${order.scheduledTime}，店家尚未安排美容台`;
  }

  return "店家尚未安排美容台";
}
