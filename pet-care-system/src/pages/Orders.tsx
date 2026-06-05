import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  CalendarDays,
  Home,
  Scissors,
  CreditCard,
  Star,
  FileText,
  X,
  CheckCircle,
  Clock3,
  CircleX,
  MessageSquare,
  RefreshCcw,
  ChevronDown,
  Image,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";
import MemberBackButton from "../components/MemberBackButton";

interface Order {
  id: string;
  userId: string;
  petId: string;
  petName?: string;
  serviceType: "accommodation" | "grooming";
  roomType?: "standard" | "deluxe" | "vip";
  groomingService?: "basic" | "styling" | "spa";
  startDate: string;
  endDate?: string | null;
  assignedSpot?: string | null;
  scheduledTime?: string | null;
  assignmentNote?: string;
  careLogs?: CareLog[];
  cancelReason?: string;
  total: number;
  addOnItems?: { id: string; name: string; price: number }[];
  addOnTotal?: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paidAmount?: number;
  balanceDue?: number;
  notes?: string;
  rating?: number | null;
  review?: string | null;
  createdAt: string;
}

interface CareLog {
  id: string;
  orderId: string;
  authorName: string;
  logType: string;
  message: string;
  photoUrl?: string;
  visibleToCustomer: boolean;
  createdAt: string;
}

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [payOrderId, setPayOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("線上付款");
  const [canceling, setCanceling] = useState(false);
  const [showHistoryOrders, setShowHistoryOrders] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "completed" | "canceled"
  >("all");
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [serviceFilter, setServiceFilter] = useState<
    "all" | "accommodation" | "grooming"
  >("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid">("all");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const roomNames = {
    standard: "豪華單人房",
    deluxe: "舒適雙人房",
    vip: "VIP總統套房",
  };

  const groomingNames = {
    basic: "基礎洗澡護理",
    styling: "造型剪毛設計",
    spa: "SPA深層護理",
  };

  async function fetchOrders(showToastOnError = true) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "讀取訂單失敗");
        return;
      }

      setOrders(data.orders || []);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error(error);
      if (showToastOnError) {
        toast.error("無法連線到後端，請確認 Flask 是否已啟動");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      fetchOrders(false);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [user]);

  async function handlePay(orderId: string) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "付款失敗");
        return;
      }

      toast.success("付款成功");
      setPayOrderId(null);
      setPaymentMethod("線上付款");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("付款失敗");
    }
  }

  async function handleCancel(orderId: string) {
    try {
      setCanceling(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelReason }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "取消失敗");
        return;
      }

      toast.success("已取消預約");
      setCancelOrderId(null);
      setCancelReason("");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("取消失敗");
    } finally {
      setCanceling(false);
    }
  }

  async function handleReconfirm(orderId: string, confirmed: boolean) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders/${orderId}/reconfirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "預約確認失敗");
        return;
      }

      toast.success(data.message || (confirmed ? "已確認預約" : "已取消預約"));
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("預約確認失敗");
    }
  }

  async function handleReviewSubmit(orderId: string) {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders/${orderId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          review,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "送出評價失敗");
        return;
      }

      toast.success("感謝您的評價");
      setReviewOrderId(null);
      setRating(5);
      setReview("");
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error("送出評價失敗");
    }
  }

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  const cancelOrder = useMemo(() => {
    return sortedOrders.find((order) => order.id === cancelOrderId) || null;
  }, [cancelOrderId, sortedOrders]);

  const payOrder = useMemo(() => {
    return sortedOrders.find((order) => order.id === payOrderId) || null;
  }, [payOrderId, sortedOrders]);

  const activeOrders = sortedOrders.filter(
    (order) => order.status !== "已取消" && order.status !== "已完成"
  );

  const completedOrders = sortedOrders.filter(
    (order) => order.status === "已完成"
  );

  const canceledOrders = sortedOrders.filter(
    (order) => order.status === "已取消"
  );

  const filteredActiveOrders = activeOrders.filter((order) => {
    const matchService =
      serviceFilter === "all" || order.serviceType === serviceFilter;
    const matchPayment =
      paymentFilter === "all" || order.paymentStatus !== "已付款";

    return matchService && matchPayment;
  });

  const historyOrders = [...completedOrders, ...canceledOrders]
    .filter((order) => {
      if (historyFilter === "completed") return order.status === "已完成";
      if (historyFilter === "canceled") return order.status === "已取消";
      return true;
    })
    .filter((order) => {
      const keyword = historyKeyword.trim().toLowerCase();
      const title =
        order.serviceType === "accommodation"
          ? roomNames[order.roomType as keyof typeof roomNames] || "住宿服務"
          : groomingNames[order.groomingService as keyof typeof groomingNames] ||
            "美容服務";
      const content = [
        order.id,
        order.petName,
        title,
        order.status,
        order.paymentStatus,
        order.startDate,
        order.endDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchKeyword = !keyword || content.includes(keyword);
      const matchStart = !historyStartDate || order.startDate >= historyStartDate;
      const matchEnd = !historyEndDate || order.startDate <= historyEndDate;

      return matchKeyword && matchStart && matchEnd;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const getOrderTitle = (order: Order) => {
    if (order.serviceType === "accommodation") {
      return roomNames[order.roomType as keyof typeof roomNames] || "住宿服務";
    }

    return (
      groomingNames[order.groomingService as keyof typeof groomingNames] ||
      "美容服務"
    );
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      待確認: "bg-[#fff8f2] text-[#b87868]",
      已確認: "bg-[#f7fbff] text-[#6f9fc2]",
      待會員確認: "bg-[#fff8e8] text-[#a97922]",
      已入住: "bg-[#eef7ef] text-[#4f7f55]",
      進行中: "bg-[#fdf6f0] text-[#6b3a2a]",
      已完成: "bg-[#f3f7f3] text-[#5f8a5f]",
      已取消: "bg-[#fff0f0] text-[#b85c38]",
    };

    return map[status] || "bg-gray-100 text-gray-600";
  };

  const getPaymentBadge = (status: string) => {
    if (status === "已付款") return "bg-[#f3f7f3] text-[#5f8a5f]";
    if (status === "已付訂金") return "bg-[#fff8f2] text-[#a97922]";
    return "bg-[#fff0f0] text-[#b87868]";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffefe] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-[#f0e6df] text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-[#6b3a2a]">正在讀取訂單資料...</p>
        </div>
      </div>
    );
  }

  if (sortedOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl p-10 border border-[#f0e6df] text-center">
            <div className="mb-6 text-left">
              <MemberBackButton />
            </div>
            <div className="text-6xl mb-6">📋</div>

            <h1 className="text-3xl text-[#3d1a0d] mb-4">我的訂單</h1>

            <p className="text-gray-600 mb-8">
              目前還沒有預約紀錄，快去為毛孩安排服務吧！
            </p>

            <button
              onClick={() => navigate("/booking")}
              className="px-8 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all"
            >
              前往預約
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffefe]">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8]">
        <div className="absolute left-8 top-10 text-8xl opacity-10">🐾</div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10">
          📋
        </div>

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="mb-6">
            <MemberBackButton />
          </div>
          <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6">
            <FileText className="w-4 h-4" />
            訂單管理
          </div>

          <h1 className="text-5xl mb-6 text-[#3d1a0d]">我的訂單</h1>

          <p className="text-xl text-[#6b3a2a] max-w-2xl mx-auto leading-relaxed">
            查看目前預約、已完成服務與已取消紀錄，讓訂單狀態更清楚。
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fetchOrders()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm text-[#6b3a2a] shadow-sm border border-[#eadfd8] hover:bg-[#faf7f4]"
            >
              <RefreshCcw className="w-4 h-4" />
              重新同步
            </button>
            <p className="text-xs text-[#8b6b5a]">
              自動同步中
              {lastSyncedAt
                ? `，最後更新 ${lastSyncedAt.toLocaleTimeString()}`
                : ""}
            </p>
          </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div>
            <div className="mb-6">
              <p className="text-sm mb-2 text-[#b87868]">CURRENT ORDERS</p>
              <h2 className="text-3xl text-[#3d1a0d]">目前預約</h2>
              <p className="text-sm text-gray-600 mt-2">
                尚未完成或尚未取消的訂單會顯示在這裡。
              </p>
            </div>

            <div className="mb-6 rounded-3xl border border-[#f0e6df] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-[#3d1a0d]">快速篩選</p>
                  <p className="mt-1 text-xs text-gray-500">
                    共 {activeOrders.length} 筆目前預約，符合條件 {filteredActiveOrders.length} 筆
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "全部服務", value: "all" },
                    { label: "住宿", value: "accommodation" },
                    { label: "美容", value: "grooming" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setServiceFilter(
                          item.value as "all" | "accommodation" | "grooming"
                        )
                      }
                      className={`rounded-full px-4 py-2 text-sm transition-all ${
                        serviceFilter === item.value
                          ? "bg-[#6b3a2a] text-white"
                          : "bg-[#faf7f4] text-[#6b3a2a] hover:bg-[#f3e4d7]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentFilter((value) =>
                        value === "unpaid" ? "all" : "unpaid"
                      )
                    }
                    className={`rounded-full px-4 py-2 text-sm transition-all ${
                      paymentFilter === "unpaid"
                        ? "bg-[#b87868] text-white"
                        : "bg-[#fff0f0] text-[#b87868] hover:bg-[#ffe4df]"
                    }`}
                  >
                    只看待付款
                  </button>
                </div>
              </div>
            </div>

            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#f0e6df] shadow-md p-10 text-center">
                <Clock3 className="w-12 h-12 text-[#c8a97e] mx-auto mb-4" />
                <h3 className="text-2xl text-[#3d1a0d] mb-2">
                  目前沒有進行中的預約
                </h3>
                <p className="text-gray-600 mb-6">
                  新的住宿或美容預約會顯示在這裡。
                </p>
                <button
                  onClick={() => navigate("/booking")}
                  className="px-7 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all"
                >
                  前往預約
                </button>
              </div>
            ) : filteredActiveOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#f0e6df] shadow-md p-10 text-center">
                <FileText className="w-12 h-12 text-[#c8a97e] mx-auto mb-4" />
                <h3 className="text-2xl text-[#3d1a0d] mb-2">
                  沒有符合條件的預約
                </h3>
                <p className="text-gray-600">
                  可以切換篩選條件，或展開下方歷史紀錄查看。
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredActiveOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    title={getOrderTitle(order)}
                    statusClass={getStatusBadge(order.status)}
                    paymentClass={getPaymentBadge(order.paymentStatus)}
                    onPay={setPayOrderId}
                    onCancel={setCancelOrderId}
                    onReconfirm={handleReconfirm}
                    onDetail={(id) => navigate(`/orders/${id}`)}
                    showActions
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 rounded-3xl border border-[#f0e6df] bg-[#faf7f4] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#6b3a2a] shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl text-[#3d1a0d]">歷史紀錄</h3>
                    <p className="text-xs text-gray-500">
                      已完成 {completedOrders.length} 筆，已取消 {canceledOrders.length} 筆，預設收起保留查詢。
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryOrders((value) => !value)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm text-[#6b3a2a] shadow-sm hover:bg-[#fdf6f0]"
              >
                {showHistoryOrders ? "收起歷史紀錄" : "查看歷史紀錄"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showHistoryOrders ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {showHistoryOrders && (
              <div className="mt-5">
                <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7060]" />
                      <input
                        value={historyKeyword}
                        onChange={(event) =>
                          setHistoryKeyword(event.target.value)
                        }
                        className="w-full rounded-full border border-[#eadfd8] bg-[#fffefe] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#6b3a2a]"
                        placeholder="搜尋訂單編號、毛孩或服務"
                      />
                    </label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(event) =>
                        setHistoryStartDate(event.target.value)
                      }
                      className="rounded-full border border-[#eadfd8] bg-[#fffefe] px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-[#6b3a2a]"
                      aria-label="歷史紀錄起始日期"
                    />
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(event) =>
                        setHistoryEndDate(event.target.value)
                      }
                      className="rounded-full border border-[#eadfd8] bg-[#fffefe] px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-[#6b3a2a]"
                      aria-label="歷史紀錄結束日期"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryKeyword("");
                        setHistoryStartDate("");
                        setHistoryEndDate("");
                      }}
                      className="rounded-full border border-[#eadfd8] px-4 py-2.5 text-sm text-[#6b3a2a] hover:bg-[#faf7f4]"
                    >
                      清除
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { label: "全部歷史", value: "all", icon: <FileText className="h-4 w-4" /> },
                    { label: "已完成", value: "completed", icon: <CheckCircle className="h-4 w-4" /> },
                    { label: "已取消", value: "canceled", icon: <CircleX className="h-4 w-4" /> },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        setHistoryFilter(
                          item.value as "all" | "completed" | "canceled"
                        )
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                        historyFilter === item.value
                          ? "bg-[#6b3a2a] text-white"
                          : "bg-white text-[#6b3a2a] hover:bg-[#fdf6f0]"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>

                {historyOrders.length === 0 ? (
                  <SideEmpty text="目前沒有符合條件的歷史紀錄" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {historyOrders.map((order) => (
                      <MiniOrderCard
                        key={order.id}
                        order={order}
                        title={getOrderTitle(order)}
                        statusClass={getStatusBadge(order.status)}
                        onReview={
                          order.status === "已完成"
                            ? () => setReviewOrderId(order.id)
                            : undefined
                        }
                        onDetail={() => navigate(`/orders/${order.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 評價區塊 */}
      {reviewOrderId && (
        <ReviewModal
          rating={rating}
          review={review}
          onRatingChange={setRating}
          onReviewChange={setReview}
          onCancel={() => {
            setReviewOrderId(null);
            setRating(5);
            setReview("");
          }}
          onSubmit={() => handleReviewSubmit(reviewOrderId)}
        />
      )}

      {cancelOrder && (
        <CancelOrderModal
          order={cancelOrder}
          reason={cancelReason}
          loading={canceling}
          onReasonChange={setCancelReason}
          onCancel={() => {
            setCancelOrderId(null);
            setCancelReason("");
          }}
          onConfirm={() => handleCancel(cancelOrder.id)}
        />
      )}

      {payOrder && (
        <PaymentModal
          order={payOrder}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onCancel={() => setPayOrderId(null)}
          onSubmit={() => handlePay(payOrder.id)}
        />
      )}
    </div>
  );
}

function OrderCard({
  order,
  title,
  statusClass,
  paymentClass,
  onPay,
  onCancel,
  onReconfirm,
  onDetail,
  showActions,
}: {
  order: Order;
  title: string;
  statusClass: string;
  paymentClass: string;
  onPay: (id: string) => void;
  onCancel: (id: string) => void;
  onReconfirm: (id: string, confirmed: boolean) => void;
  onDetail: (id: string) => void;
  showActions?: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-[#f0e6df] overflow-hidden">
      <div className="bg-gradient-to-r from-[#fdf6f0] to-[#f5ede8] px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            {order.serviceType === "accommodation" ? (
              <Home className="w-7 h-7 text-[#6b3a2a]" />
            ) : (
              <Scissors className="w-7 h-7 text-[#b87868]" />
            )}
          </div>

          <div>
            <h2 className="text-2xl text-[#3d1a0d] mb-1">{title}</h2>
            <p className="text-sm text-[#6b3a2a]">
              毛孩：{order.petName || "未提供"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              訂單編號：#{order.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`px-4 py-2 rounded-full text-sm ${statusClass}`}>
            {order.status}
          </span>

          <span className={`px-4 py-2 rounded-full text-sm ${paymentClass}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <InfoBox
            label="服務日期"
            value={
              order.serviceType === "accommodation"
                ? `${order.startDate} ～ ${order.endDate}`
                : order.startDate
            }
            icon={<CalendarDays className="w-5 h-5" />}
          />

          <InfoBox
            label="付款金額"
            value={`NT$ ${order.total.toLocaleString()}`}
            icon={<CreditCard className="w-5 h-5" />}
          />

          <InfoBox
            label="付款進度"
            value={paymentSummary(order)}
            icon={<CreditCard className="w-5 h-5" />}
          />

          <InfoBox
            label="店家安排"
            value={assignmentSummary(order)}
            icon={
              order.serviceType === "accommodation" ? (
                <Home className="w-5 h-5" />
              ) : (
                <Scissors className="w-5 h-5" />
              )
            }
          />
        </div>

        {order.notes && (
          <div className="rounded-2xl bg-[#faf7f4] p-4 mb-5">
            <p className="text-sm text-gray-500 mb-1">備註</p>
            <p className="text-gray-700 text-sm leading-relaxed">
              {order.notes}
            </p>
          </div>
        )}

        {order.addOnItems && order.addOnItems.length > 0 && (
          <div className="rounded-2xl bg-[#fff8f2] p-4 mb-5 border border-[#f0e6df]">
            <p className="text-sm text-[#6b3a2a] mb-2">加購服務</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {order.addOnItems.map((item) => item.name).join("、")}
              <span className="ml-2 text-[#b87868]">
                + NT$ {(order.addOnTotal || 0).toLocaleString()}
              </span>
            </p>
          </div>
        )}

        {order.careLogs && order.careLogs.length > 0 && (
          <div className="rounded-2xl bg-[#f7fbff] p-4 mb-5 border border-[#d9eaf5]">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-[#6f9fc2]" />
              <p className="text-sm text-[#3d1a0d]">店家照護回報</p>
            </div>

            <div className="space-y-3">
              {order.careLogs.slice(0, 3).map((log) => (
                <div
                  key={log.id}
                  className={`rounded-xl border p-3 ${
                    log.logType === "異常"
                      ? "border-[#f0c8ce] bg-[#fff4f5]"
                      : "border-transparent bg-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        log.logType === "異常"
                          ? "bg-[#ffe2e6] text-[#b85c68]"
                          : "bg-[#edf6fc] text-[#3f789f]"
                      }`}
                    >
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
                </div>
              ))}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex flex-wrap gap-3">
            {order.status === "待會員確認" && (
              <div className="w-full rounded-2xl border border-[#f1d58a] bg-[#fff8e8] p-4">
                <p className="mb-3 text-sm text-[#8a611b]">
                  請於預約前確認是否仍要保留此預約；若不前往，系統會取消並釋出位置。
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onReconfirm(order.id, true)}
                    className="rounded-full bg-[#6b3a2a] px-5 py-2.5 text-sm text-white hover:bg-[#8b5040]"
                  >
                    確認要預約
                  </button>
                  <button
                    type="button"
                    onClick={() => onReconfirm(order.id, false)}
                    className="rounded-full border border-[#b87868] px-5 py-2.5 text-sm text-[#b87868] hover:bg-[#fff5f2]"
                  >
                    不預約，釋出位置
                  </button>
                </div>
              </div>
            )}

            {order.paymentStatus !== "已付款" &&
              order.status !== "已取消" &&
              order.status !== "待會員確認" && (
                <button
                  onClick={() => onPay(order.id)}
                  className="px-5 py-2.5 rounded-full bg-[#6b3a2a] text-white hover:bg-[#8b5040] transition-all"
                >
                  前往付款
                </button>
              )}

            {(order.status === "待確認" ||
              order.status === "已確認" ||
              order.status === "待會員確認") && (
              <button
                onClick={() => onCancel(order.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#b87868] text-[#b87868] hover:bg-[#fff5f2] transition-all"
              >
                <X className="w-4 h-4" />
                取消預約
              </button>
            )}

            <button
              onClick={() => onDetail(order.id)}
              className="px-5 py-2.5 rounded-full border border-[#6b3a2a] text-[#6b3a2a] hover:bg-[#fdf6f0] transition-all"
            >
              查看詳情
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniOrderCard({
  order,
  title,
  statusClass,
  onReview,
  onDetail,
}: {
  order: Order;
  title: string;
  statusClass: string;
  onReview?: () => void;
  onDetail?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#f0e6df] p-4 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#faf7f4] flex items-center justify-center">
          {order.serviceType === "accommodation" ? (
            <Home className="w-5 h-5 text-[#6b3a2a]" />
          ) : (
            <Scissors className="w-5 h-5 text-[#b87868]" />
          )}
        </div>

        <div className="flex-1">
          <h4 className="text-sm text-[#3d1a0d]">{title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {order.startDate}
            {order.endDate ? ` ～ ${order.endDate}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`px-3 py-1 rounded-full text-xs ${statusClass}`}>
          {order.status}
        </span>

        <span className="text-xs text-[#6b3a2a]">
          NT$ {order.total.toLocaleString()}
        </span>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        安排：{assignmentSummary(order)}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        付款：{paymentSummary(order)}
      </p>
      {order.cancelReason && (
        <p className="mt-1 text-xs text-[#b87868]">
          取消原因：{order.cancelReason}
        </p>
      )}

      {order.status === "已完成" && (
        <div className="mt-3">
          {order.rating ? (
            <div className="rounded-xl bg-[#fff8f2] p-3">
              <p className="text-xs text-[#6b3a2a] mb-1">
                評分：{order.rating} / 5
              </p>
              <p className="text-xs text-gray-600">
                {order.review || "無評語"}
              </p>
            </div>
          ) : (
            <button
              onClick={onReview}
              className="w-full inline-flex items-center justify-center gap-2 mt-2 py-2 rounded-full bg-[#c8a15f] text-white text-sm hover:opacity-90 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              前往評價
            </button>
          )}
        </div>
      )}

      {onDetail && (
        <button
          type="button"
          onClick={onDetail}
          className="mt-3 w-full rounded-full border border-[#6b3a2a] py-2 text-sm text-[#6b3a2a] hover:bg-[#fdf6f0]"
        >
          查看詳情
        </button>
      )}
    </div>
  );
}

function SideSection({
  title,
  subtitle,
  icon,
  count,
  tone,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number;
  tone: "green" | "rose";
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#f3f7f3] text-[#5f8a5f]"
      : "bg-[#fff0f0] text-[#b87868]";

  return (
    <div className="rounded-3xl bg-[#faf7f4] border border-[#f0e6df] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneClass}`}
            >
              {icon}
            </div>
            <h3 className="text-xl text-[#3d1a0d]">{title}</h3>
          </div>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${toneClass}`}
        >
          {count}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
          />
        </button>
      </div>

      {!collapsed && <div className="mt-4">{children}</div>}
    </div>
  );
}

function SideEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#f0e6df] p-5 text-center">
      <p className="text-sm text-gray-500">{text}</p>
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

function paymentSummary(order: Order) {
  const paidAmount = order.paidAmount || 0;
  const balanceDue = order.balanceDue ?? Math.max(0, order.total - paidAmount);
  const method = order.paymentMethod ? ` / ${order.paymentMethod}` : "";

  if (order.paymentStatus === "已付款") {
    return `已收 NT$ ${order.total.toLocaleString()}${method}`;
  }

  if (order.paymentStatus === "已付訂金") {
    return `已收 NT$ ${paidAmount.toLocaleString()}，尚餘 NT$ ${balanceDue.toLocaleString()}${method}`;
  }

  return `尚未付款，應付 NT$ ${order.total.toLocaleString()}`;
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#faf7f4] p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        {icon}
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-[#3d1a0d]">{value}</p>
    </div>
  );
}

function ReviewModal({
  rating,
  review,
  onRatingChange,
  onReviewChange,
  onCancel,
  onSubmit,
}: {
  rating: number;
  review: string;
  onRatingChange: (value: number) => void;
  onReviewChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-[#f0e6df]">
        <div className="text-center mb-6">
          <Star className="w-10 h-10 text-[#c8a15f] mx-auto mb-3" />
          <h2 className="text-2xl text-[#3d1a0d]">填寫服務評價</h2>
          <p className="text-sm text-gray-500 mt-2">
            分享你的體驗，幫助我們提供更好的服務。
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">評分</label>
          <div className="relative">
            <select
              value={rating}
              onChange={(e) => onRatingChange(Number(e.target.value))}
              className="h-12 w-full appearance-none rounded-3xl border border-[#eadfd8] bg-[#fffaf6] px-4 pr-12 text-sm font-semibold text-[#3d1a0d] shadow-[0_10px_24px_rgba(80,53,42,0.05)] outline-none transition hover:border-[#c8a97e] focus:border-[#6b3a2a] focus:bg-white focus:ring-4 focus:ring-[#f4ebe5]"
            >
              <option value={5}>5 分 - 非常滿意</option>
              <option value={4}>4 分 - 滿意</option>
              <option value={3}>3 分 - 普通</option>
              <option value={2}>2 分 - 待改善</option>
              <option value={1}>1 分 - 不滿意</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-[#6b3a2a] shadow-sm">
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-2">評語</label>
          <textarea
            value={review}
            onChange={(e) => onReviewChange(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-[#eadfd8] rounded-2xl focus:outline-none"
            placeholder="歡迎分享本次服務體驗"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSubmit}
            className="flex-1 py-3 rounded-full bg-[#6b3a2a] text-white hover:bg-[#8b5040]"
          >
            送出評價
          </button>

          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelOrderModal({
  order,
  reason,
  loading,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  order: Order;
  reason: string;
  loading: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reasons = ["臨時有事", "時間不方便", "價格考量", "寵物狀況不適合", "其他"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-[#f0e6df]">
        <div className="text-center mb-6">
          <X className="w-10 h-10 text-[#b87868] mx-auto mb-3" />
          <h2 className="text-2xl text-[#3d1a0d]">取消這筆預約？</h2>
          <p className="text-sm text-gray-500 mt-2">
            訂單 #{order.id} 取消後會保留紀錄，請選擇取消原因。
          </p>
        </div>

        <div className="grid gap-2">
          {reasons.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onReasonChange(item)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                reason === item
                  ? "border-[#b87868] bg-[#fff5f2] text-[#8b5040]"
                  : "border-[#eadfd8] text-gray-600 hover:bg-[#faf7f4]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={3}
          className="mt-4 w-full rounded-2xl border border-[#eadfd8] px-4 py-3 text-sm outline-none"
          placeholder="也可以自行輸入取消原因"
        />

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            返回
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-[#b87868] text-white hover:bg-[#a66657] disabled:opacity-60"
          >
            {loading ? "取消中..." : "確認取消"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  order,
  paymentMethod,
  onPaymentMethodChange,
  onCancel,
  onSubmit,
}: {
  order: Order;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const methods = ["線上付款", "信用卡", "轉帳", "現金", "現場付款", "其他"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-[#f0e6df]">
        <div className="text-center mb-6">
          <CreditCard className="w-10 h-10 text-[#6b3a2a] mx-auto mb-3" />
          <h2 className="text-2xl text-[#3d1a0d]">選擇付款方式</h2>
          <p className="text-sm text-gray-500 mt-2">
            訂單 #{order.id} 應付 NT$ {order.total.toLocaleString()}
          </p>
        </div>

        <div className="grid gap-3">
          {methods.map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                paymentMethod === method
                  ? "border-[#6b3a2a] bg-[#fdf6f0] text-[#3d1a0d]"
                  : "border-[#eadfd8] text-gray-600"
              }`}
            >
              <span>{method}</span>
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === method}
                onChange={() => onPaymentMethodChange(method)}
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 py-3 rounded-full bg-[#6b3a2a] text-white hover:bg-[#8b5040]"
          >
            確認付款
          </button>
        </div>
      </div>
    </div>
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
          className="mb-2 h-36 w-full rounded-2xl object-cover"
        />
      )}
      <a
        href={photoUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#faf7f4] px-3 py-1.5 text-xs text-[#6b3a2a] hover:bg-[#f3e4d7]"
      >
        <Image className="h-3.5 w-3.5" />
        查看照片
      </a>
    </div>
  );
}
