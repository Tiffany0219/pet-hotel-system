import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Check,
  Sparkles,
  Clock,
  Shield,
  Luggage,
  PawPrint,
  ArrowRight,
  CalendarCheck,
  RefreshCcw,
  ImageIcon,
} from "lucide-react";
import { API_BASE } from "../config";
import {
  defaultBusinessSettings,
  defaultServiceCatalog,
  fetchPublicSystemSettings,
  type BusinessSettings,
  type ServiceCatalog,
} from "../systemSettings";

type RoomAvailability = {
  capacity: number;
  booked: number;
  remaining: number;
};

type AvailabilityState = {
  standard: RoomAvailability;
  deluxe: RoomAvailability;
  vip: RoomAvailability;
};

export default function Rooms() {
  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [serviceCatalog, setServiceCatalog] =
    useState<ServiceCatalog>(defaultServiceCatalog);
  const [businessSettings, setBusinessSettings] =
    useState<BusinessSettings>(defaultBusinessSettings);

  const [availability, setAvailability] = useState<AvailabilityState>({
    standard: { capacity: 5, booked: 0, remaining: 5 },
    deluxe: { capacity: 3, booked: 0, remaining: 3 },
    vip: { capacity: 2, booked: 0, remaining: 2 },
  });

  useEffect(() => {
    async function fetchAvailability() {
      try {
        setLoadingAvailability(true);
        setAvailabilityError("");

        const res = await fetch(
          `${API_BASE}/availability/rooms?date=${selectedDate}`
        );

        const data = await res.json();

        if (!res.ok) {
          setAvailabilityError(data.message || "讀取房況失敗");
          return;
        }

        if (data.rooms) {
          setAvailability(data.rooms);
        }
      } catch (error) {
        console.error("讀取房況失敗", error);
        setAvailabilityError("無法連線到後端，請確認 Flask 是否已啟動");
      } finally {
        setLoadingAvailability(false);
      }
    }

    fetchAvailability();
  }, [selectedDate]);

  useEffect(() => {
    fetchPublicSystemSettings()
      .then((settings) => {
        setServiceCatalog(settings.serviceCatalog);
        setBusinessSettings(settings.businessSettings);
      })
      .catch((error) => {
        console.error("讀取系統設定失敗", error);
      });
  }, []);

  const rooms = [
    {
      id: "standard",
      name: "豪華單人房",
      price: serviceCatalog.roomPrices.standard,
      image: "/images/room-standard.jpg",
      fallbackEmoji: "🏠",
      size: "60cm x 80cm",
      suitable: "小型犬貓（10kg以下）",
      badge: "輕量入住",
      bg: "from-[#fdf6f0] to-[#f3e4d7]",
      accent: "#6b3a2a",
      highlight: false,
      remaining: availability.standard.remaining,
      capacity: availability.standard.capacity,
      booked: availability.standard.booked,
      features: [
        "獨立空調系統",
        "舒適睡墊",
        "每日清潔消毒",
        "24小時監控",
        "專屬飲水與餐具",
        "每日兩次遛放時間",
      ],
    },
    {
      id: "deluxe",
      name: "舒適雙人房",
      price: serviceCatalog.roomPrices.deluxe,
      image: "/images/room-deluxe.jpg",
      fallbackEmoji: "🏡",
      size: "100cm x 120cm",
      suitable: "中型犬或多隻寵物",
      badge: "人氣房型",
      bg: "from-[#f3f7f3] to-[#e0efe0]",
      accent: "#5f8a5f",
      highlight: false,
      remaining: availability.deluxe.remaining,
      capacity: availability.deluxe.capacity,
      booked: availability.deluxe.booked,
      features: [
        "獨立空調系統",
        "加大舒適睡墊",
        "每日清潔消毒",
        "24小時監控",
        "每日三次遛放時間",
        "玩具與娛樂設施",
      ],
    },
    {
      id: "vip",
      name: "VIP總統套房",
      price: serviceCatalog.roomPrices.vip,
      image: "/images/room-vip.jpg",
      fallbackEmoji: "🏰",
      size: "150cm x 200cm",
      suitable: "大型犬或多隻寵物",
      badge: "頂級推薦",
      bg: "from-[#fff8f0] to-[#f2e6d8]",
      accent: "#c8a15f",
      highlight: true,
      remaining: availability.vip.remaining,
      capacity: availability.vip.capacity,
      booked: availability.vip.booked,
      features: [
        "頂級加大睡墊",
        "不限次數遛放",
        "獨立遊戲區",
        "免費美容服務",
        "專屬照護員",
        "每日健康報告",
      ],
    },
  ];

  const notices = [
    {
      icon: Clock,
      title: "入住時間",
      items: [
        `平日服務：${businessSettings.weekdayHours}`,
        `假日服務：${businessSettings.weekendHours}`,
      ],
      bg: "from-[#f7fbff] to-[#e8f3fb]",
      iconBg: "bg-[#6f9fc2]",
    },
    {
      icon: Luggage,
      title: "攜帶物品",
      items: ["疫苗證明", "慣用飼料 / 喜愛玩具"],
      bg: "from-[#fff8f2] to-[#f3e4d7]",
      iconBg: "bg-[#c8a97e]",
    },
    {
      icon: Shield,
      title: "取消政策",
      items: ["7天前：全額退費", "3-6天：退費50%", "1-2天：不退費"],
      bg: "from-[#fff5f2] to-[#f6ddd5]",
      iconBg: "bg-[#b87868]",
    },
    {
      icon: PawPrint,
      title: "其他事項",
      items: ["須完成基本疫苗", "特殊需求可提前告知"],
      bg: "from-[#f4f3f7] to-[#e3e1ec]",
      iconBg: "bg-[#6b6a8f]",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fffefe]">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8]">
        <div className="absolute left-8 top-10 text-8xl opacity-10 hero-paw-animate">
          🐾
        </div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10 hero-paw-animate">
          🏡
        </div>
        <div className="absolute left-1/2 top-24 w-72 h-72 -translate-x-1/2 rounded-full bg-[#f6ddd5] opacity-30 blur-3xl blob-1"></div>

        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6 soft-pop">
            <Sparkles className="w-4 h-4" />
            舒適住宿・安心照護
          </div>

          <h1 className="text-5xl mb-6 text-[#3d1a0d] hero-title-animate">
            住宿房型
          </h1>

          <p className="text-xl text-[#6b3a2a] max-w-2xl mx-auto leading-relaxed hero-text-animate">
            從小型犬貓到大型毛孩，提供不同空間與照護等級的住宿選擇。
          </p>
        </div>
      </section>

      {/* 房型 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* 房況查詢 */}
          <div className="mb-10 bg-white rounded-3xl shadow-md border border-[#f0e6df] p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-[#b87868] mb-1">
                  ROOM AVAILABILITY
                </p>
                <h2 className="text-2xl text-[#3d1a0d]">
                  查詢房型剩餘數量
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  選擇日期後，可查看當天各房型剩餘間數。
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  查詢日期
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-3 border border-[#eadfd8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c8a97e]"
                />
              </div>
            </div>

            {/* 日期確認區 */}
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fdf6f0] text-[#6b3a2a] text-sm border border-[#f0e6df]">
                <CalendarCheck className="w-4 h-4" />
                目前查看日期：
                <span className="font-medium">{selectedDate}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f3f7f3] text-[#5f8a5f] text-sm border border-[#dbe9db]">
                <RefreshCcw className="w-4 h-4" />
                {loadingAvailability ? "房況更新中..." : "房況已更新"}
              </div>

              {selectedDate === today ? (
                <div className="px-4 py-2 rounded-full bg-[#f7fbff] text-[#6f9fc2] text-sm border border-[#dcecf7]">
                  你現在查看的是：今天
                </div>
              ) : (
                <div className="px-4 py-2 rounded-full bg-[#fff8f2] text-[#b87868] text-sm border border-[#f2ddd2]">
                  你現在查看的是：未來日期
                </div>
              )}
            </div>

            {availabilityError && (
              <div className="mt-4 rounded-2xl bg-[#fff0f0] border border-[#f1d0cb] px-4 py-3 text-sm text-[#b87868]">
                {availabilityError}
              </div>
            )}
          </div>

          <div className="mb-6 text-lg text-[#3d1a0d]">
            以下為{" "}
            <span className="font-semibold text-[#6b3a2a]">
              {selectedDate}
            </span>{" "}
            的房型剩餘狀況
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`relative group rounded-3xl overflow-hidden bg-white transition-all duration-300 border home-card-hover ${
                  room.highlight
                    ? "shadow-2xl border-[#c8a97e] md:-translate-y-3"
                    : "shadow-md border-[#f0e6df] hover:shadow-2xl hover:-translate-y-2"
                }`}
              >
                {room.highlight && (
                  <div className="absolute top-4 right-4 z-20 bg-[#c8a97e] text-white text-xs px-3 py-1 rounded-full shadow-sm">
                    推薦
                  </div>
                )}

                {/* 圖片區 */}
                <div className={`relative bg-gradient-to-br ${room.bg}`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";

                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />

                    {/* 沒放照片時的備用畫面 */}
                    <div
                      className={`hidden w-full h-full items-center justify-center bg-gradient-to-br ${room.bg}`}
                    >
                      <div className="text-center">
                        <div className="text-6xl mb-3">{room.fallbackEmoji}</div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-[#6b3a2a] text-sm shadow-sm">
                          <ImageIcon className="w-4 h-4" />
                          可放入房型照片
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent"></div>

                    <div
                      className="absolute top-4 left-4 text-xs px-3 py-1 rounded-full bg-white/90 shadow-sm"
                      style={{ color: room.accent }}
                    >
                      {room.badge}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl mb-1 text-white drop-shadow">
                        {room.name}
                      </h3>
                      <p className="text-sm text-white/90 drop-shadow">
                        {room.suitable}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 text-center">
                    <div
                      className="text-3xl mb-2"
                      style={{ color: room.accent }}
                    >
                      NT$ {room.price.toLocaleString()}
                      <span className="text-sm text-gray-500"> /晚</span>
                    </div>

                    <div
                      className={`mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm ${
                        room.remaining > 0
                          ? "bg-[#f3f7f3] text-[#5f8a5f]"
                          : "bg-[#fff0f0] text-[#b87868]"
                      }`}
                    >
                      {room.remaining > 0
                        ? `此日期剩餘 ${room.remaining} / ${room.capacity} 間`
                        : "此日期已額滿"}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      已預訂 {room.booked} 間
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="rounded-2xl bg-[#faf7f4] p-4">
                      <p className="text-xs text-gray-500 mb-1">房型大小</p>
                      <p className="text-sm text-gray-800">{room.size}</p>
                    </div>

                    <div className="rounded-2xl bg-[#faf7f4] p-4">
                      <p className="text-xs text-gray-500 mb-1">適合對象</p>
                      <p className="text-sm text-gray-800">依體型安排</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">房型特色</p>

                  <ul className="space-y-2 mb-6">
                    {room.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <Check
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: room.accent }}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {room.remaining > 0 ? (
                    <Link
                      to="/booking"
                      className={`inline-flex w-full items-center justify-center gap-2 py-3 rounded-full transition-all ${
                        room.highlight
                          ? "bg-[#6b3a2a] text-white hover:bg-[#8b5040] shadow-lg"
                          : "border-2 border-[#6b3a2a] text-[#6b3a2a] hover:bg-[#6b3a2a] hover:text-white"
                      }`}
                    >
                      立即預約
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-full bg-gray-200 text-gray-500 cursor-not-allowed"
                    >
                      已額滿
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 住宿須知 */}
      <section className="py-16 bg-gradient-to-br from-[#fdf6f0] to-[#f5ede8]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm mb-3 text-[#b87868]">NOTICE</p>
            <h2 className="text-3xl text-[#3d1a0d]">住宿須知</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {notices.map((notice) => {
              const Icon = notice.icon;

              return (
                <div
                  key={notice.title}
                  className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border border-[#f0e6df] home-card-hover"
                >
                  <div
                    className={`rounded-3xl p-5 mb-5 bg-gradient-to-br ${notice.bg} flex items-center justify-center`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${notice.iconBg}`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl mb-4 text-[#3d1a0d]">
                    {notice.title}
                  </h3>

                  <div className="space-y-2">
                    {notice.items.map((item) => (
                      <p key={item} className="text-sm text-gray-700">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
