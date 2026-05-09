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
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const navs = [
  { to: "/", label: "首頁" },
  { to: "/services", label: "服務項目" },
  { to: "/rooms", label: "住宿房型" },
  { to: "/grooming", label: "美容服務" },
  { to: "/about", label: "關於我們" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
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
              <div className="relative group">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-[#fdf0e0] text-[#6b3a2a] hover:bg-[#f3e4d7] transition-all border border-[#f0e6df]">
                  <User className="w-4 h-4" />
                  <span>{user.name || "會員中心"}</span>
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
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 rounded-full bg-[#6b3a2a] text-white hover:bg-[#8b5040] transition-all"
              >
                登入 / 註冊
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden text-[#6b3a2a]"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
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
                <Link to="/booking">立即預約</Link>
              </p>
              <p>
                <Link to="/orders">我的訂單</Link>
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-3">聯絡資訊</h3>
            <p className="text-sm text-[#e8c9a0]">服務時間：09:00 - 21:00</p>
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