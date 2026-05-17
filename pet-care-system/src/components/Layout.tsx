import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  PawPrint,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  Bell,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  defaultBusinessSettings,
  fetchPublicSystemSettings,
  type BusinessSettings,
} from "../systemSettings";
import { API_BASE } from "../config";

const navs = [
  { to: "/", label: "首頁" },
  { to: "/services", label: "服務項目" },
  { to: "/rooms", label: "住宿房型" },
  { to: "/grooming", label: "美容服務" },
  { to: "/branches", label: "分店資訊" },
  { to: "/about", label: "關於我們" },
];

type NotificationItem = {
  id: string;
  orderId?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [businessSettings, setBusinessSettings] =
    useState<BusinessSettings>(defaultBusinessSettings);
  const isStaffPanelUser = user?.role === "staff" || user?.role === "admin";
  const isCareWorker = user?.role === "groomer" || user?.role === "caregiver";
  const isSystemAdmin = user?.role === "admin";
  const isMember = user && !isStaffPanelUser && !isCareWorker;
  const workerLabel = user?.role === "groomer" ? "美容師工作台" : "照護師工作台";

  useEffect(() => {
    fetchPublicSystemSettings()
      .then((settings) => setBusinessSettings(settings.businessSettings))
      .catch((error) => {
        console.error("讀取系統設定失敗", error);
      });
  }, []);

  async function fetchNotifications() {
    if (!isMember) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const realResponse = await fetchNotificationsFromApi(token);
      setNotifications(
        (realResponse.notifications || []).filter(
          (notification: NotificationItem) => !notification.read
        )
      );
      setUnreadCount(realResponse.unreadCount || 0);
    } catch (error) {
      console.error("讀取通知失敗", error);
    }
  }

  useEffect(() => {
    fetchNotifications();

    if (!isMember) return;

    const timer = window.setInterval(fetchNotifications, 10000);
    return () => window.clearInterval(timer);
  }, [isMember, user?.id]);

  async function fetchNotificationsFromApi(token: string | null) {
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "通知讀取失敗");
    }

    return data;
  }

  async function markNotificationRead(notification: NotificationItem) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id)
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      setNotificationOpen(false);
      navigate("/orders");
    } catch (error) {
      console.error("通知已讀失敗", error);
    }
  }

  async function markAllNotificationsRead() {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("通知全部已讀失敗", error);
    }
  }

  const handleLogout = () => {
    logout();
    setOpen(false);
    setNotificationOpen(false);
    navigate("/");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-full text-sm transition-all ${
      isActive
        ? "bg-[#fdf0e0] text-[#6b3a2a]"
        : "text-gray-600 hover:text-[#6b3a2a] hover:bg-[#faf7f4]"
    }`;

  const mobileLinkClass =
    "block px-4 py-3 rounded-2xl text-sm text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all";

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefe]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#f0e6df]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-[#3d1a0d]">
            <span className="w-10 h-10 rounded-2xl bg-[#6b3a2a] flex items-center justify-center">
              <PawPrint className="w-6 h-6 text-white" />
            </span>
            <div>
              <span className="text-xl font-medium">毛孩樂園</span>
              <p className="text-xs text-[#9c7060] leading-none">
                Pet Care Center
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navs.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop member */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {isMember && (
                  <NotificationBell
                    open={notificationOpen}
                    notifications={notifications}
                    unreadCount={unreadCount}
                    onToggle={() => setNotificationOpen((value) => !value)}
                    onRead={markNotificationRead}
                    onReadAll={markAllNotificationsRead}
                  />
                )}

                <div className="relative group">
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-[#fdf0e0] text-[#6b3a2a] hover:bg-[#f3e4d7] transition-all border border-[#f0e6df]">
                    {isStaffPanelUser || isCareWorker ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span>
                      {isStaffPanelUser
                        ? isSystemAdmin
                          ? "系統管理員"
                          : "店務管理後台"
                        : isCareWorker
                        ? workerLabel
                        : user.name || "會員中心"}
                    </span>
                    <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
                  </button>

                  {/* Hover dropdown */}
                  <div className="absolute right-0 top-full pt-3 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200">
                    <div className="w-64 bg-white rounded-3xl shadow-2xl border border-[#f0e6df] p-3">
                    <div className="px-4 py-3 mb-2 rounded-2xl bg-gradient-to-br from-[#fdf6f0] to-[#f5ede8]">
                      <p className="text-xs text-gray-500">目前登入</p>
                      <p className="text-sm text-[#3d1a0d] truncate">
                        {user.name || "會員"}
                      </p>
                      <p className="text-xs text-[#9c7060] truncate">
                        {user.email}
                      </p>
                    </div>

                    {isStaffPanelUser ? (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                      >
                        <ShieldCheck className="w-5 h-5 text-[#6f9fc2]" />
                        <div>
                          <p className="text-sm">
                            {isSystemAdmin ? "系統管理員後台" : "店務管理後台"}
                          </p>
                          <p className="text-xs text-gray-400">
                            訂單、房況與營收
                          </p>
                        </div>
                      </Link>
                    ) : isCareWorker ? (
                      <Link
                        to="/workbench"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                      >
                        <ShieldCheck className="w-5 h-5 text-[#6f9fc2]" />
                        <div>
                          <p className="text-sm">{workerLabel}</p>
                          <p className="text-xs text-gray-400">
                            排程、照護紀錄與異常通知
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                        >
                          <User className="w-5 h-5 text-[#6b3a2a]" />
                          <div>
                            <p className="text-sm">會員中心</p>
                            <p className="text-xs text-gray-400">查看個人資料</p>
                          </div>
                        </Link>

                        <Link
                          to="/pets"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                        >
                          <PawPrint className="w-5 h-5 text-[#b87868]" />
                          <div>
                            <p className="text-sm">我的寵物</p>
                            <p className="text-xs text-gray-400">管理毛孩資料</p>
                          </div>
                        </Link>

                        <Link
                          to="/booking"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                        >
                          <Calendar className="w-5 h-5 text-[#5f8a5f]" />
                          <div>
                            <p className="text-sm">預約服務</p>
                            <p className="text-xs text-gray-400">
                              住宿 / 美容預約
                            </p>
                          </div>
                        </Link>

                        <Link
                          to="/orders"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                        >
                          <ShoppingBag className="w-5 h-5 text-[#6f9fc2]" />
                          <div>
                            <p className="text-sm">我的訂單</p>
                            <p className="text-xs text-gray-400">查看預約紀錄</p>
                          </div>
                        </Link>

                        <Link
                          to="/notifications"
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-700 hover:bg-[#faf7f4] hover:text-[#6b3a2a] transition-all"
                        >
                          <Bell className="w-5 h-5 text-[#c8a15f]" />
                          <div>
                            <p className="text-sm">通知中心</p>
                            <p className="text-xs text-gray-400">
                              查看已讀與未讀通知
                            </p>
                          </div>
                        </Link>
                      </>
                    )}

                    <div className="my-2 border-t border-[#f0e6df]" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[#b87868] hover:bg-[#fff0f0] transition-all text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <div>
                        <p className="text-sm">登出</p>
                        <p className="text-xs text-[#c58b7f]">離開會員帳號</p>
                      </div>
                    </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 rounded-full bg-[#6b3a2a] text-white hover:bg-[#8b5040] transition-all"
              >
                登入 / 註冊
              </Link>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 lg:hidden">
            {isMember && (
              <NotificationBell
                open={notificationOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onToggle={() => setNotificationOpen((value) => !value)}
                onRead={markNotificationRead}
                onReadAll={markAllNotificationsRead}
              />
            )}
            <button
              className="text-[#6b3a2a]"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-[#f0e6df] bg-white px-4 py-4 space-y-2">
            {navs.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={navClass}
              >
                {item.label}
              </NavLink>
            ))}

            <div className="pt-3 border-t border-[#f0e6df]">
              {user ? (
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-[#fdf6f0] to-[#f5ede8]">
                    <p className="text-xs text-gray-500">目前登入</p>
                    <p className="text-sm text-[#3d1a0d]">
                      {user.name || "會員"}
                    </p>
                    <p className="text-xs text-[#9c7060]">{user.email}</p>
                  </div>

                  {isStaffPanelUser ? (
                    <Link
                      onClick={() => setOpen(false)}
                      to="/admin"
                      className={mobileLinkClass}
                    >
                      {isSystemAdmin ? "系統管理員後台" : "店務管理後台"}
                    </Link>
                  ) : isCareWorker ? (
                    <Link
                      onClick={() => setOpen(false)}
                      to="/workbench"
                      className={mobileLinkClass}
                    >
                      {workerLabel}
                    </Link>
                  ) : (
                    <>
                      <Link
                        onClick={() => setOpen(false)}
                        to="/dashboard"
                        className={mobileLinkClass}
                      >
                        會員中心
                      </Link>

                      <Link
                        onClick={() => setOpen(false)}
                        to="/pets"
                        className={mobileLinkClass}
                      >
                        我的寵物
                      </Link>

                      <Link
                        onClick={() => setOpen(false)}
                        to="/booking"
                        className={mobileLinkClass}
                      >
                        預約服務
                      </Link>

                      <Link
                        onClick={() => setOpen(false)}
                        to="/orders"
                        className={mobileLinkClass}
                      >
                        我的訂單
                      </Link>

                      <Link
                        onClick={() => setOpen(false)}
                        to="/notifications"
                        className={mobileLinkClass}
                      >
                        通知中心
                      </Link>
                    </>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 rounded-2xl text-left text-[#b87868] bg-[#fff0f0]"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <Link
                  onClick={() => setOpen(false)}
                  to="/login"
                  className="inline-block px-5 py-2 rounded-full bg-[#6b3a2a] text-white"
                >
                  登入 / 註冊
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#3d1a0d] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <PawPrint className="w-6 h-6 text-[#e8c9a0]" />
              <span className="text-xl">毛孩樂園</span>
            </div>
            <p className="text-sm text-[#e8c9a0] leading-relaxed">
              提供寵物住宿、美容、健康照護與即時回報的線上預約平台。
            </p>
          </div>

          <div>
            <h3 className="mb-3">快速連結</h3>
            <div className="space-y-2 text-sm text-[#e8c9a0]">
              <p>
                <Link to="/services">服務項目</Link>
              </p>
              <p>
                <Link to="/branches">分店資訊</Link>
              </p>
              <p>
                <Link to="/booking">立即預約</Link>
              </p>
              <p>
                <Link to="/orders">我的訂單</Link>
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3">聯絡資訊</h3>
            <p className="text-sm text-[#e8c9a0]">
              平日服務：{businessSettings.weekdayHours}
            </p>
            <p className="text-sm text-[#e8c9a0]">
              假日服務：{businessSettings.weekendHours}
            </p>
            <p className="text-sm text-[#e8c9a0]">電話：07-123-4567</p>
            <p className="text-sm text-[#e8c9a0]">
              Email：service@petcare.test
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NotificationBell({
  open,
  notifications,
  unreadCount,
  onToggle,
  onRead,
  onReadAll,
}: {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  onToggle: () => void;
  onRead: (notification: NotificationItem) => void;
  onReadAll: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f0e6df] bg-white text-[#6b3a2a] shadow-sm transition-all hover:bg-[#faf7f4]"
        aria-label="通知"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b85c68] px-1.5 text-xs text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-[#f0e6df] bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#f0e6df] px-4 py-3">
            <div>
              <p className="text-sm text-[#3d1a0d]">通知中心</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} 則未讀通知` : "目前沒有未讀通知"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onReadAll}
                className="rounded-full bg-[#faf7f4] px-3 py-1 text-xs text-[#6b3a2a] hover:bg-[#f3e4d7]"
              >
                全部已讀
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-[#c8a97e]" />
                <p className="text-sm text-gray-500">還沒有通知</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isAlert = notification.type === "alert";
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onRead(notification)}
                    className={`w-full rounded-xl p-3 text-left transition-all hover:bg-[#faf7f4] ${
                      notification.read ? "opacity-70" : "bg-[#fffefe]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                          isAlert
                            ? "bg-[#fff0f0] text-[#b85c68]"
                            : "bg-[#f7fbff] text-[#6f9fc2]"
                        }`}
                      >
                        {isAlert ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm text-[#3d1a0d]">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-[#b85c68]" />
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-[#9c7060]">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
