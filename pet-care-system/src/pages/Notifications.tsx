import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle, MessageSquare, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "../config";
import MemberBackButton from "../components/MemberBackButton";

type NotificationItem = {
  id: string;
  orderId?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  async function loadNotifications() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/notifications?includeRead=1`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "讀取通知失敗");
        return;
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error(error);
      toast.error("讀取通知失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markRead(id: string) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await loadNotifications();
    } catch (error) {
      console.error(error);
      toast.error("標記已讀失敗");
    }
  }

  async function markAllRead() {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await loadNotifications();
      toast.success("已全部標記已讀");
    } catch (error) {
      console.error(error);
      toast.error("標記已讀失敗");
    }
  }

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.read);
    }

    if (filter === "read") {
      return notifications.filter((item) => item.read);
    }

    return notifications;
  }, [filter, notifications]);

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="bg-[#faf7f4] border-b border-[#f0e6df]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="mb-6">
            <MemberBackButton />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-[#6b3a2a] shadow-sm">
                <Bell className="h-4 w-4" />
                通知中心
              </div>
              <h1 className="mt-4 text-4xl text-[#3d1a0d]">通知紀錄</h1>
              <p className="mt-2 text-sm text-gray-600">
                查看照護回報、異常通知與系統提醒。
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-full bg-[#6b3a2a] px-5 py-2.5 text-sm text-white hover:bg-[#8b5040]"
            >
              全部標記已讀
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ["all", "全部"],
            ["unread", "未讀"],
            ["read", "已讀"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
              className={`rounded-full px-4 py-2 text-sm ${
                filter === value
                  ? "bg-[#6b3a2a] text-white"
                  : "bg-[#faf7f4] text-[#6b3a2a]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#f0e6df] bg-white p-8 text-center text-gray-500">
            正在讀取通知...
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#eadfd8] bg-white p-10 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-[#c8a97e]" />
            <p className="text-[#3d1a0d]">目前沒有通知</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((notification) => {
              const isAlert = notification.type === "alert";
              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm ${
                    isAlert ? "border-[#f0c8ce]" : "border-[#f0e6df]"
                  }`}
                >
                  <div className="flex gap-4">
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                        isAlert
                          ? "bg-[#fff0f0] text-[#b85c68]"
                          : "bg-[#f7fbff] text-[#6f9fc2]"
                      }`}
                    >
                      {isAlert ? <AlertTriangle /> : <MessageSquare />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg text-[#3d1a0d]">
                          {notification.title}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            notification.read
                              ? "bg-gray-100 text-gray-500"
                              : "bg-[#fff0f0] text-[#b85c68]"
                          }`}
                        >
                          {notification.read ? "已讀" : "未讀"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">
                        {notification.message}
                      </p>
                      <p className="mt-3 text-xs text-[#9c7060]">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className="self-start rounded-full border border-[#eadfd8] p-2 text-[#6b3a2a] hover:bg-[#faf7f4]"
                        aria-label="標記已讀"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
