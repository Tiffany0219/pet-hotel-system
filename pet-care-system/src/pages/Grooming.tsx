import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, Sparkles, ImageIcon } from "lucide-react";
import {
  defaultNotificationSettings,
  defaultServiceCatalog,
  fetchPublicSystemSettings,
  type NotificationSettings,
  type ServiceCatalog,
} from "../systemSettings";

export default function Grooming() {
  const [serviceCatalog, setServiceCatalog] =
    useState<ServiceCatalog>(defaultServiceCatalog);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);

  useEffect(() => {
    fetchPublicSystemSettings()
      .then((settings) => {
        setServiceCatalog(settings.serviceCatalog);
        setNotificationSettings(settings.notificationSettings);
      })
      .catch((error) => {
        console.error("讀取系統設定失敗", error);
      });
  }, []);

  const services = [
    {
      id: "basic",
      name: "基礎洗澡護理",
      price: serviceCatalog.groomingPrices.basic,
      duration: "60分鐘",
      image: "/images/grooming-basic.jpg",
      fallbackEmoji: "🛁",
      badge: "入門推薦",
      suitable: "所有犬貓",
      bg: "from-[#f7fbff] to-[#e8f3fb]",
      accent: "#6f9fc2",
      button: "bg-[#6f9fc2] hover:bg-[#5c8bad]",
      includes: [
        "專業洗澡",
        "吹乾造型",
        "耳朵清潔",
        "指甲修剪",
        "肛門腺清理",
      ],
    },
    {
      id: "styling",
      name: "造型剪毛設計",
      price: serviceCatalog.groomingPrices.styling,
      duration: "90-120分鐘",
      image: "/images/grooming-styling.jpg",
      fallbackEmoji: "✂️",
      badge: "人氣選擇",
      suitable: "需要造型的犬貓",
      bg: "from-[#fff5f5] to-[#f8e2df]",
      accent: "#b87868",
      button: "bg-[#b87868] hover:bg-[#a66657]",
      includes: ["專業洗澡", "全身剪毛造型", "造型設計", "香水噴霧"],
    },
    {
      id: "spa",
      name: "SPA深層護理",
      price: serviceCatalog.groomingPrices.spa,
      duration: "120-150分鐘",
      image: "/images/grooming-spa.jpg",
      fallbackEmoji: "💆",
      badge: "高級護理",
      suitable: "需要深層護理的犬貓",
      bg: "from-[#fffaf0] to-[#f2e4c8]",
      accent: "#c8a15f",
      button: "bg-[#6b3a2a] hover:bg-[#8b5040]",
      includes: [
        "深層SPA護理",
        "毛髮保養",
        "皮膚護理",
        "香氛精油",
        "拍照留念",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#fffefe]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] py-20">
        <div className="absolute left-8 top-10 text-8xl opacity-10 hero-paw-animate">
          🐾
        </div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10 hero-paw-animate">
          🫧
        </div>
        <div className="absolute left-1/2 top-20 w-72 h-72 -translate-x-1/2 rounded-full bg-[#f6ddd5] opacity-30 blur-3xl blob-1"></div>

        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6 soft-pop">
            <Sparkles className="w-4 h-4" />
            溫柔美容・專業照護
          </div>

          <h1 className="text-5xl mb-6 text-[#3d1a0d] hero-title-animate">
            美容服務
          </h1>

          <p className="text-xl text-[#6b3a2a] max-w-2xl mx-auto leading-relaxed hero-text-animate">
            從基礎清潔到深層護理，依照毛孩狀況提供最適合的美容方案。
          </p>
        </div>
      </section>

      {/* 服務卡片 */}
      <section className="py-16 bg-[#fffefe]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service.id}
                className="group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#f0e6df] home-card-hover"
              >
                {/* 照片區 */}
                <div className={`relative bg-gradient-to-br ${service.bg}`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";

                        const fallback =
                          target.nextElementSibling as HTMLElement | null;

                        if (fallback) {
                          fallback.style.display = "flex";
                        }
                      }}
                    />

                    {/* 沒放照片時的備用畫面 */}
                    <div
                      className={`hidden w-full h-full items-center justify-center bg-gradient-to-br ${service.bg}`}
                    >
                      <div className="text-center">
                        <div className="text-6xl mb-3">
                          {service.fallbackEmoji}
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-[#6b3a2a] text-sm shadow-sm">
                          <ImageIcon className="w-4 h-4" />
                          可放入美容照片
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent"></div>

                    <div
                      className="absolute top-4 right-4 text-xs px-3 py-1 rounded-full bg-white/90 shadow-sm"
                      style={{ color: service.accent }}
                    >
                      {service.badge}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl mb-1 text-white drop-shadow">
                        {service.name}
                      </h3>
                      <p className="text-sm text-white/90 drop-shadow">
                        服務時長：{service.duration}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 text-center">
                    <div
                      className="text-3xl mb-2"
                      style={{ color: service.accent }}
                    >
                      NT$ {service.price.toLocaleString()}
                      <span className="text-sm text-gray-500"> 起</span>
                    </div>

                    <p className="text-sm text-gray-600">
                      {service.suitable}
                    </p>
                  </div>
                </div>

                {/* 內容區 */}
                <div className="p-6">
                  <div className="mb-5 p-4 rounded-2xl bg-[#faf7f4]">
                    <p className="text-xs text-gray-500 mb-1">適合對象</p>
                    <p className="text-sm text-gray-700">
                      {service.suitable}
                    </p>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">服務內容</p>

                  <ul className="space-y-2 mb-6">
                    {service.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <Check
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: service.accent }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/booking"
                    className={`block w-full py-3 text-center rounded-full text-white transition-all shadow-md hover:shadow-lg ${service.button}`}
                  >
                    立即預約
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 價格與須知 */}
      <section className="py-16 bg-gradient-to-br from-[#fdf6f0] to-[#f5ede8]">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-8">
          <Info
            title="價格說明"
            items={[
              "價格依寵物體型、毛量與毛髮狀況調整",
              "中型犬：約基礎價 1.5 倍",
              "大型犬：約基礎價 2 倍",
              "毛髮嚴重打結需另收整理費",
            ]}
          />

          <Info
            title="服務須知"
            items={[
              "建議提前 3 天預約，以保留合適時段",
              `系統會於服務前 ${notificationSettings.bookingReminderHours} 小時提醒`,
              "寵物須完成基本疫苗接種",
              "取消預約請於 24 小時前告知",
              "若服務過程中發現異常，將即時通知飼主",
            ]}
          />
        </div>
      </section>

      {/* 優惠 CTA */}
      <section className="py-16 bg-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl p-12 shadow-xl bg-gradient-to-br from-[#fff5f2] via-[#f6ddd5] to-[#e8c9a0] home-card-hover">
            <div className="absolute left-8 top-8 text-6xl opacity-10 hero-paw-animate">
              ✂️
            </div>
            <div className="absolute right-8 bottom-8 text-6xl opacity-10 hero-paw-animate">
              🫧
            </div>

            <h2 className="text-3xl mb-4 text-[#3d1a0d]">
              首次體驗優惠
            </h2>
            <p className="text-xl mb-6 text-[#6b3a2a]">
              新會員首次美容服務享 8 折優惠
            </p>
            <Link
              to="/login"
              className="inline-block px-8 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg"
            >
              立即註冊
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-white/90 rounded-3xl p-8 shadow-md border border-[#f0e6df] home-card-hover">
      <h2 className="text-2xl mb-6 text-[#3d1a0d]">{title}</h2>
      <div className="space-y-3 text-sm text-gray-700">
        {items.map((i) => (
          <p key={i}>• {i}</p>
        ))}
      </div>
    </div>
  );
}
