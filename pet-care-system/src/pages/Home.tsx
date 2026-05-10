import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  Bed,
  Scissors,
  Heart,
  Star,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { API_BASE } from "../config";

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

export default function Home() {
  const { user } = useAuth();

  const today = new Date().toISOString().split("T")[0];

  const [roomAvailability, setRoomAvailability] = useState<AvailabilityState>({
    standard: { capacity: 5, booked: 0, remaining: 5 },
    deluxe: { capacity: 3, booked: 0, remaining: 3 },
    vip: { capacity: 2, booked: 0, remaining: 2 },
  });

  useEffect(() => {
    async function fetchRoomAvailability() {
      try {
        const response = await fetch(
          `${API_BASE}/availability/rooms?date=${today}`
        );

        const data = await response.json();

        if (response.ok && data.rooms) {
          setRoomAvailability(data.rooms);
        }
      } catch (error) {
        console.error("首頁房況讀取失敗", error);
      }
    }

    fetchRoomAvailability();
  }, [today]);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #fdf6f0 0%, #f5ede8 50%, #fdf0e0 100%)",
        }}
      >
        {/* 背景裝飾 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-8 text-8xl opacity-10 hero-paw-animate">
            🐾
          </div>

          <div className="absolute bottom-16 right-10 text-8xl opacity-10 hero-paw-animate">
            🐾
          </div>

          <div className="absolute top-24 right-1/4 w-40 h-40 rounded-full bg-[#f3ded0] blur-3xl opacity-60 blob-1"></div>

          <div className="absolute bottom-10 left-1/3 w-52 h-52 rounded-full bg-[#f6e6da] blur-3xl opacity-50 blob-2"></div>

          <div className="absolute left-[45%] top-20 text-5xl opacity-10 hero-paw-animate">
            🦴
          </div>

          <div className="absolute left-[12%] bottom-28 text-5xl opacity-10 hero-paw-animate">
            🐶
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* 左側文案 */}
            <div className="fade-up">
              <div
                className="inline-block px-4 py-2 rounded-full text-sm mb-6 shadow-sm soft-pop"
                style={{
                  background: "#fff8f3",
                  color: "#7a4a36",
                  border: "1px solid #ead8ce",
                }}
              >
                ✨ 專業寵物住宿・美容照護
              </div>

              <h1
                className="text-5xl md:text-6xl mb-6 leading-tight tracking-tight hero-title-animate"
                style={{ color: "#3d1a0d" }}
              >
                給毛孩
                <br />
                最溫暖的家
              </h1>

              <p
                className="text-xl mb-8 leading-relaxed hero-text-animate"
                style={{ color: "#6b3a2a" }}
              >
                從住宿、美容到即時回報，
                <br />
                用專業與溫柔陪伴每一隻毛孩。
              </p>

              <div className="flex gap-4 flex-wrap mb-10">
                <Link
                  to="/booking"
                  className="inline-flex items-center gap-2 px-8 py-4 text-white rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 hero-button-animate"
                  style={{
                    background: "linear-gradient(135deg, #6b3a2a, #8b5040)",
                  }}
                >
                  立即預約
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  to="/services"
                  className="px-8 py-4 rounded-full transition-all border-2 hover:-translate-y-1 home-card-hover"
                  style={{
                    borderColor: "#6b3a2a",
                    color: "#3d1a0d",
                    background: "rgba(255,255,255,0.45)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#6b3a2a";
                    (e.currentTarget as HTMLElement).style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.45)";
                    (e.currentTarget as HTMLElement).style.color = "#3d1a0d";
                  }}
                >
                  了解服務
                </Link>
              </div>

              {/* 數字卡 */}
              <div className="grid grid-cols-3 gap-4 max-w-xl">
                {[
                  { value: "1000+", label: "服務家庭" },
                  { value: "4.9", label: "平均評分" },
                  { value: "24H", label: "安心照護" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={`rounded-3xl bg-white/70 backdrop-blur-sm px-6 py-5 shadow-md border border-[#efe2d9] stat-card stat-delay-${index} home-card-hover`}
                  >
                    <div
                      className="text-4xl md:text-5xl font-light mb-2"
                      style={{ color: "#7a4a36" }}
                    >
                      {item.value}
                    </div>
                    <div className="text-sm" style={{ color: "#7b6d66" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 右側主視覺 */}
            <div className="relative fade-up delay-1">
              <div className="relative rounded-[2rem] p-4 bg-white/70 shadow-2xl border border-[#eadfd8] hero-card-animate">
                <div className="relative h-[430px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#fdf6f0] to-[#eadfd8]">
                  <img
                    src="/images/hero-pet.jpg"
                    alt="寵物住宿與美容照護"
                    className="w-full h-full object-cover"
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
                  <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-[#fdf6f0] to-[#eadfd8]">
                    <div className="text-center">
                      <div className="text-8xl mb-5 hero-dog-animate">
                        🐶
                      </div>
                      <p className="text-[#6b3a2a] text-lg">
                        可放入首頁寵物照片
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        public/images/hero-pet.jpg
                      </p>
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"></div>

                  {/* 登入後才顯示：房況，並與後端同步 */}
                  {user && (
                    <div className="absolute left-4 top-4 rounded-2xl bg-white/88 backdrop-blur-sm shadow-md border border-white/60 px-4 py-3 w-44">
                      <p className="text-[11px] text-gray-500 mb-2">
                        今日房況
                      </p>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">單人房</span>
                          <span
                            className={
                              roomAvailability.standard.remaining > 0
                                ? "text-[#5f8a5f]"
                                : "text-[#b87868]"
                            }
                          >
                            {roomAvailability.standard.remaining} 間
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">雙人房</span>
                          <span
                            className={
                              roomAvailability.deluxe.remaining > 0
                                ? "text-[#5f8a5f]"
                                : "text-[#b87868]"
                            }
                          >
                            {roomAvailability.deluxe.remaining} 間
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">VIP</span>
                          <span
                            className={
                              roomAvailability.vip.remaining > 0
                                ? "text-[#5f8a5f]"
                                : "text-[#b87868]"
                            }
                          >
                            {roomAvailability.vip.remaining} 間
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 登入後才顯示：即時回報 */}
                  {user && (
                    <div className="absolute right-4 bottom-4 rounded-2xl bg-white/88 backdrop-blur-sm shadow-md border border-white/60 px-4 py-4 w-56">
                      <p className="text-[11px] text-gray-500 mb-2">
                        即時照護回報
                      </p>

                      <p className="text-sm text-[#3d1a0d] leading-relaxed">
                        小Q 今日狀態良好，已完成散步與餵食。
                      </p>

                      <div className="mt-3 inline-flex px-3 py-1 rounded-full bg-[#f3f7f3] text-[#5f8a5f] text-xs">
                        已更新
                      </div>
                    </div>
                  )}

                  {/* 左下文字：登入前後顯示不同內容 */}
                  <div className="absolute left-6 bottom-6 text-white">
                    <p className="text-sm mb-1 opacity-90">Pet Care Center</p>

                    <h3 className="text-3xl drop-shadow mb-2">
                      溫柔照護每一天
                    </h3>

                    {user ? (
                      <>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 fill-yellow-400 text-yellow-400 hero-star-animate"
                            />
                          ))}
                        </div>

                        <p className="text-sm text-white/90">
                          超過 1000 個家庭信賴
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-white/90">
                        登入後可查看房況與照護回報
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 -top-5 text-5xl hero-paw-animate opacity-40">
                🐾
              </div>

              <div className="absolute -left-4 bottom-10 text-5xl hero-paw-animate opacity-40">
                🦴
              </div>
            </div>
          </div>

          {/* 往下提示 */}
          <div className="hidden md:flex justify-center mt-14">
            <div className="scroll-hint">
              <span>往下看看更多服務 ↓</span>
            </div>
          </div>
        </div>
      </section>

      {/* 服務 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 fade-up">
            <h2 className="text-4xl mb-4" style={{ color: "#3d1a0d" }}>
              我們的服務
            </h2>
            <p className="text-gray-600 text-lg">
              專業、安心、貼心的全方位照護
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group service-card bg-gradient-to-br from-[#f6f3ff] to-[#eef6ff] p-10 rounded-3xl home-card-hover">
              <div className="w-16 h-16 bg-[#7b8fe8] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bed className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-3xl mb-4" style={{ color: "#3d1a0d" }}>
                寵物住宿
              </h3>

              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                提供舒適安全的住宿環境，24小時專業照護，讓您的寵物住得安心。
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "豪華單人房 - 適合小型犬貓",
                  "舒適雙人房 - 適合中型犬",
                  "VIP總統套房 - 頂級享受",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-[#7b8fe8]" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/rooms"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7b8fe8] text-white rounded-full hover:opacity-90 transition-all hover:-translate-y-1"
              >
                查看詳情 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="group service-card bg-gradient-to-br from-[#fff2f6] to-[#fff6ef] p-10 rounded-3xl home-card-hover">
              <div className="w-16 h-16 bg-[#e88aa6] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Scissors className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-3xl mb-4" style={{ color: "#3d1a0d" }}>
                美容服務
              </h3>

              <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                專業美容師團隊，提供洗澡、剪毛、造型設計等全方位美容服務。
              </p>

              <div className="space-y-3 mb-8">
                {["基礎洗澡護理", "造型剪毛設計", "SPA深層護理"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-[#e88aa6]" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/grooming"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#e88aa6] text-white rounded-full hover:opacity-90 transition-all hover:-translate-y-1"
              >
                查看詳情 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 為什麼選擇我們 */}
      <section
        className="py-20"
        style={{
          background: "linear-gradient(135deg, #fdf6f0, #f5ede8)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 fade-up">
            <h2 className="text-4xl mb-4" style={{ color: "#3d1a0d" }}>
              為什麼選擇我們
            </h2>
            <p className="text-gray-600 text-lg">用心、專業、值得信賴</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card bg-white p-8 rounded-2xl text-center home-card-hover">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
                style={{
                  background: "linear-gradient(135deg, #fdf0e0, #f5ede8)",
                }}
              >
                <Heart className="w-10 h-10" style={{ color: "#6b3a2a" }} />
              </div>

              <h3 className="text-2xl mb-3" style={{ color: "#3d1a0d" }}>
                專業照護
              </h3>

              <p className="text-gray-600 leading-relaxed">
                經驗豐富的照護團隊，24小時悉心照料，確保每一隻毛孩都得到最好的照顧
              </p>
            </div>

            <div className="feature-card bg-white p-8 rounded-2xl text-center home-card-hover">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-gradient-to-br from-blue-100 to-cyan-100">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>

              <h3 className="text-2xl mb-3" style={{ color: "#3d1a0d" }}>
                安全保障
              </h3>

              <p className="text-gray-600 leading-relaxed">
                完善的監控系統與安全措施，讓您的毛孩安全無虞，讓您放心無憂
              </p>
            </div>

            <div className="feature-card bg-white p-8 rounded-2xl text-center home-card-hover">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-gradient-to-br from-green-100 to-emerald-100">
                <Clock className="w-10 h-10 text-green-600" />
              </div>

              <h3 className="text-2xl mb-3" style={{ color: "#3d1a0d" }}>
                即時更新
              </h3>

              <p className="text-gray-600 leading-relaxed">
                透過照片與影片即時回報寵物狀況，讓您隨時掌握毛孩的一舉一動
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 text-white"
        style={{
          background: "linear-gradient(135deg, #6b3a2a, #8b5040)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center fade-up">
          <h2 className="text-4xl mb-6">準備好為您的毛孩預約了嗎？</h2>

          <p
            className="text-xl mb-10 leading-relaxed"
            style={{ color: "#f1ddc8" }}
          >
            立即預約我們的專業服務，讓您的寵物享受最優質的照護體驗
          </p>

          <Link
            to="/booking"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white rounded-full transition-all shadow-lg hover:shadow-xl text-lg hover:-translate-y-1 home-card-hover"
            style={{ color: "#6b3a2a" }}
          >
            立即預約
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
