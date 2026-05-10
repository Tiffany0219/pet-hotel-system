import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  PawPrint,
  Calendar,
  ShoppingBag,
  User,
  Edit,
  Sparkles,
  Gift,
  Megaphone,
  ArrowRight,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { API_BASE } from "../config";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const quickLinks = [
    {
      title: "我的寵物",
      description: "管理您的寵物資料",
      icon: PawPrint,
      link: "/pets",
      bg: "from-[#fdf6f0] to-[#f3e4d7]",
      iconBg: "bg-[#6b3a2a]",
    },
    {
      title: "立即預約",
      description: "預約住宿或美容服務",
      icon: Calendar,
      link: "/booking",
      bg: "from-[#f7fbff] to-[#e8f3fb]",
      iconBg: "bg-[#6f9fc2]",
    },
    {
      title: "我的訂單",
      description: "查看預約紀錄與付款狀態",
      icon: ShoppingBag,
      link: "/orders",
      bg: "from-[#f3f7f3] to-[#e0efe0]",
      iconBg: "bg-[#5f8a5f]",
    },
  ];

  const handleCancelEdit = () => {
    setProfileForm({
      name: user?.name || "",
      phone: user?.phone || "",
    });
    setIsEditing(false);
  };

  const save = async () => {
    if (!profileForm.name.trim()) {
      toast.error("請輸入姓名");
      return;
    }

    if (!profileForm.phone.trim()) {
      toast.error("請輸入手機號碼");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "個人資料更新失敗");
        return;
      }

      await refreshUser();

      toast.success("個人資料已更新");
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="relative overflow-hidden py-16 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8]">
        <div className="absolute left-8 top-8 text-8xl opacity-10">🐾</div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10">
          🐶
        </div>

        <div className="max-w-7xl mx-auto px-4 relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6">
              <Sparkles className="w-4 h-4" />
              會員中心
            </div>

            <h1 className="text-5xl mb-4 text-[#3d1a0d]">
              歡迎回來，{user?.name || "會員"}！
            </h1>

            <p className="text-xl text-[#6b3a2a] leading-relaxed">
              在這裡管理毛孩資料、查看訂單，並快速預約服務。
            </p>
          </div>

          <div className="bg-white/80 rounded-3xl p-6 shadow-lg border border-[#f0e6df] min-w-[240px]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#6b3a2a] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>

              <div>
                <p className="text-sm text-gray-500">目前會員等級</p>
                <p className="text-xl text-[#3d1a0d]">一般會員</p>
                <p className="text-xs text-[#6b3a2a] mt-1">
                  累積消費可升級 VIP
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  to={item.link}
                  className="group bg-white rounded-3xl shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#f0e6df] overflow-hidden"
                >
                  <div className={`bg-gradient-to-br ${item.bg} p-6`}>
                    <div
                      className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl mb-2 text-[#3d1a0d]">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>

                      <ArrowRight className="w-5 h-5 text-[#6b3a2a] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8 border border-[#f0e6df]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <p className="text-sm mb-2 text-[#b87868]">PROFILE</p>
                <h2 className="text-3xl text-[#3d1a0d]">個人資料</h2>
              </div>

              <button
                onClick={() =>
                  isEditing ? handleCancelEdit() : setIsEditing(true)
                }
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#6b3a2a] text-[#6b3a2a] hover:bg-[#6b3a2a] hover:text-white transition-all disabled:opacity-60"
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    取消編輯
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4" />
                    編輯資料
                  </>
                )}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Info label="姓名">
                {isEditing ? (
                  <input
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        name: e.target.value,
                      })
                    }
                    className="input-soft"
                    placeholder="請輸入姓名"
                  />
                ) : (
                  <p className="text-gray-900">{user?.name || "尚未填寫"}</p>
                )}
              </Info>

              <Info label="電子郵件">
                <p className="text-gray-900 break-all">
                  {user?.email || "尚未填寫"}
                </p>
              </Info>

              <Info label="手機號碼">
                {isEditing ? (
                  <input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        phone: e.target.value,
                      })
                    }
                    className="input-soft"
                    placeholder="請輸入手機號碼"
                  />
                ) : (
                  <p className="text-gray-900">{user?.phone || "尚未填寫"}</p>
                )}
              </Info>

              <Info label="會員等級">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdf0e0] text-[#6b3a2a] rounded-full text-sm">
                  <Sparkles className="w-4 h-4" />
                  一般會員
                </span>
              </Info>
            </div>

            {isEditing && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-7 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "儲存中..." : "儲存變更"}
                </button>

                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-7 py-3 border border-[#eadfd8] text-gray-700 rounded-full hover:bg-[#faf7f4] transition-all disabled:opacity-60"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Panel
              icon={<Gift />}
              title="會員優惠"
              bg="from-[#fff8f2] to-[#f3e4d7]"
              iconBg="bg-[#c8a97e]"
              items={[
                "首次美容服務享 8 折優惠",
                "累積消費滿萬元升級為 VIP 會員",
                "生日當月享 9 折優惠",
              ]}
            />

            <Panel
              icon={<Megaphone />}
              title="最新消息"
              bg="from-[#fff5f2] to-[#f6ddd5]"
              iconBg="bg-[#b87868]"
              items={[
                "母親節特惠活動開跑",
                "新增 VIP 總統套房，歡迎預約",
                "推薦好友註冊送優惠券",
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[#faf7f4] p-5">
      <label className="block text-sm text-gray-500 mb-2">{label}</label>
      {children}
    </div>
  );
}

function Panel({
  icon,
  title,
  bg,
  iconBg,
  items,
}: {
  icon: React.ReactElement;
  title: string;
  bg: string;
  iconBg: string;
  items: string[];
}) {
  return (
    <div
      className={`rounded-3xl p-8 shadow-md border border-[#f0e6df] bg-gradient-to-br ${bg}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center text-white`}
        >
          {icon}
        </div>

        <h3 className="text-2xl text-[#3d1a0d]">{title}</h3>
      </div>

      <ul className="space-y-3 text-gray-700">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-1 text-[#6b3a2a]">•</span>
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
