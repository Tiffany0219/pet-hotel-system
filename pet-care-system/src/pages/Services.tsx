import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Bed,
  CalendarCheck,
  Camera,
  CheckCircle,
  HeartPulse,
  Home,
  PawPrint,
  PhoneCall,
  Scissors,
  Sparkles,
  Star,
  Sun,
  Truck,
  X,
} from "lucide-react";

const services = [
  {
    icon: Bed,
    name: "寵物住宿",
    description: "提供舒適安全的住宿環境，依房型安排每日照護與回報。",
    features: [
      "多種房型選擇",
      "24 小時安全照護",
      "定期巡房與餵食",
      "住宿紀錄同步",
    ],
    bg: "from-[#fdf6f0] via-[#f7efe6] to-[#efe3d7]",
    iconBg: "bg-[#6b3a2a]",
    accent: "#6b3a2a",
    label: "主服務",
    link: "/rooms",
    cta: "查看房型",
    image: "/images/room-standard.jpg",
    detail: {
      bestFor: "適合出差、旅行、臨時過夜，或需要長時間有人照看的毛孩。",
      includes: [
        "入住前確認照護需求",
        "依房型安排房位",
        "每日餵食與巡房紀錄",
        "必要時通知家長",
      ],
      prepare: [
        "自備慣用飼料",
        "攜帶疫苗與健康資訊",
        "告知過敏、用藥或害怕事項",
      ],
    },
  },
  {
    icon: Scissors,
    name: "美容服務",
    description: "由美容師提供洗澡、修剪、造型與 SPA 護理。",
    features: ["基礎洗澡護理", "造型剪毛設計", "SPA 深層護理", "完成照片回報"],
    bg: "from-[#fff5ef] via-[#fdf0e8] to-[#f7e5dc]",
    iconBg: "bg-[#b87868]",
    accent: "#b87868",
    label: "主服務",
    link: "/grooming",
    cta: "查看美容方案",
    image: "/images/grooming-styling.jpg",
    modalImagePosition: "center 28%",
    detail: {
      bestFor: "適合需要洗澡、剪毛、造型整理，或皮膚毛髮需要定期保養的毛孩。",
      includes: [
        "基礎清潔與吹整",
        "依毛量與體型評估時間",
        "美容師完成後回報狀態",
        "可加購照片回報",
      ],
      prepare: ["告知皮膚狀況", "說明想保留或修剪的造型", "若怕吹風請先備註"],
    },
  },
  {
    icon: Sun,
    name: "日間托育",
    description: "適合白天短時間寄放，由照護師協助陪伴與活動安排。",
    features: [
      "半日 / 全日照護",
      "固定餵食與飲水",
      "活動與休息安排",
      "托育狀態回報",
    ],
    bg: "from-[#f5f7ef] via-[#f9f6ed] to-[#fff8ef]",
    iconBg: "bg-[#7d8f62]",
    accent: "#7d8f62",
    label: "短時照護",
    link: "/booking",
    cta: "預約托育",
    image: "/images/day.jpg",
    detail: {
      bestFor: "適合白天上班、短時間外出，晚上要接毛孩回家的家長。",
      includes: [
        "半日或全日照護",
        "固定飲水與餵食",
        "活動與休息安排",
        "托育狀態回報",
      ],
      prepare: ["填寫接送時間", "準備當日餐食", "告知是否能與其他毛孩互動"],
    },
  },
  {
    icon: HeartPulse,
    name: "餵藥與特殊照護",
    description: "針對老犬、幼犬或需吃藥毛孩，記錄重點狀態並通知家長。",
    features: [
      "用藥時間提醒",
      "食慾與精神觀察",
      "特殊飲食協助",
      "異常狀況通知",
    ],
    bg: "from-[#fff1ec] via-[#f8e3da] to-[#f2d5ca]",
    iconBg: "bg-[#b85c38]",
    accent: "#b85c38",
    label: "照護加強",
    link: "/booking",
    cta: "預約特殊照護",
    image: "/images/medicine.jpg",
    detail: {
      bestFor: "適合老犬、幼犬、術後恢復，或需要固定餵藥與特別觀察的毛孩。",
      includes: [
        "用藥時間提醒",
        "食慾與精神觀察",
        "異常狀況即時通知",
        "照護紀錄留存",
      ],
      prepare: [
        "提供藥袋與服用方式",
        "填寫獸醫院與緊急聯絡人",
        "清楚標示禁忌食物",
      ],
    },
  },
  {
    icon: Camera,
    name: "照護回報服務",
    description: "服務過程可透過通知、照片與紀錄，讓家長掌握毛孩狀態。",
    features: ["照片回報", "照護紀錄", "異常通知", "訂單詳情查詢"],
    bg: "from-[#f7f4ef] via-[#efe7dc] to-[#e6d8ca]",
    iconBg: "bg-[#9c7060]",
    accent: "#9c7060",
    label: "安心追蹤",
    link: "/orders",
    cta: "查看我的訂單",
    image: "/images/grooming-basic.jpg",
    detail: {
      bestFor: "適合想隨時掌握毛孩狀態，或第一次住宿、美容比較不放心的家長。",
      includes: [
        "店家照護紀錄",
        "完成照片回報",
        "異常提醒通知",
        "訂單詳情可查詢",
      ],
      prepare: ["保持通知開啟", "確認會員資料正確", "服務後可查看紀錄與照片"],
    },
  },
  {
    icon: Truck,
    name: "接送與加購服務",
    description: "提供接送、散步、特殊餐食與退房前整理等彈性加購。",
    features: ["到店 / 定點接送", "散步加購", "特殊餐食", "住宿退房前洗澡"],
    bg: "from-[#fff8f0] via-[#f4eadc] to-[#eadcc7]",
    iconBg: "bg-[#c8a15f]",
    accent: "#c8a15f",
    label: "彈性加購",
    link: "/booking",
    cta: "選擇加購",
    image: "/images/pick.jpg",
    detail: {
      bestFor: "適合需要接送、散步、特殊餐食，或希望退房前整理乾淨的家長。",
      includes: ["定點接送", "散步加購", "餵藥與特殊照護", "退房前洗澡"],
      prepare: ["填寫接送地點", "備註特殊飲食", "確認加購項目與時間"],
    },
  },
];

const scenarios = [
  {
    icon: Home,
    title: "出差或旅行過夜",
    description: "建議選擇寵物住宿，可搭配照護回報與退房前美容。",
  },
  {
    icon: Sun,
    title: "白天上班寄放",
    description: "日間托育適合短時間陪伴，晚上再接毛孩回家。",
  },
  {
    icon: Scissors,
    title: "想讓毛孩整理造型",
    description: "美容服務可依需求選擇基礎洗澡、剪毛或 SPA 護理。",
  },
  {
    icon: HeartPulse,
    title: "需要餵藥或特別注意",
    description: "特殊照護會記錄用藥、食慾、精神與異常狀況。",
  },
];

const steps = [
  {
    icon: CalendarCheck,
    title: "線上預約",
    description: "選擇服務項目、日期與毛孩資料",
  },
  {
    icon: PhoneCall,
    title: "確認預約",
    description: "專人與您確認服務細節與注意事項",
  },
  {
    icon: PawPrint,
    title: "享受服務",
    description: "由專業團隊進行住宿、美容或照護",
  },
  {
    icon: Star,
    title: "服務完成",
    description: "查看紀錄並分享您的服務評價",
  },
];

export default function Services() {
  const [selectedService, setSelectedService] = useState<
    (typeof services)[number] | null
  >(null);

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <Hero />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.name}
                  className="group overflow-hidden rounded-3xl border border-[#f0e6df] bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="relative h-52 overflow-hidden bg-[#f5ede8]">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${service.iconBg} shadow-md transition-transform group-hover:scale-110`}
                      >
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div
                        className="rounded-full bg-white/90 px-3 py-1 text-xs shadow-sm backdrop-blur-sm"
                        style={{ color: service.accent }}
                      >
                        {service.label}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`relative bg-gradient-to-br ${service.bg} p-8`}
                  >
                    <h3 className="mb-2 text-2xl text-[#3d1a0d]">
                      {service.name}
                    </h3>
                    <p className="text-sm leading-relaxed text-[#6b3a2a]">
                      {service.description}
                    </p>
                  </div>

                  <div className="p-6">
                    <p className="mb-3 text-sm text-gray-500">服務內容</p>
                    <ul className="mb-6 space-y-2">
                      {service.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-gray-700"
                        >
                          <CheckCircle
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: service.accent }}
                          />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6b3a2a] py-3 text-white shadow-md transition-all hover:bg-[#8b5040] hover:shadow-lg"
                    >
                      了解更多 <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#faf7f4] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm text-[#b87868]">SERVICE GUIDE</p>
            <h2 className="text-3xl text-[#3d1a0d]">不知道該選哪個服務？</h2>
            <p className="mt-3 text-gray-600">
              依照使用情境快速找到最適合毛孩的安排。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;

              return (
                <div
                  key={scenario.title}
                  className="rounded-3xl border border-[#f0e6df] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdf0e0] text-[#6b3a2a]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg text-[#3d1a0d]">
                    {scenario.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {scenario.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#fdf6f0] to-[#f5ede8] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm text-[#b87868]">PROCESS</p>
            <h2 className="text-3xl text-[#3d1a0d]">服務流程</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="relative rounded-3xl border border-[#f0e6df] bg-white p-6 text-center shadow-md transition-all hover:shadow-xl"
                >
                  <div className="absolute right-4 top-4 text-xs text-[#c8a97e]">
                    0{index + 1}
                  </div>
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6b3a2a] text-white">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-lg text-[#3d1a0d]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6b3a2a] to-[#8b5040] p-12 text-center text-white shadow-xl">
            <div className="absolute left-8 top-8 text-7xl opacity-10">🐾</div>
            <div className="absolute bottom-8 right-8 text-7xl opacity-10">
              🐕
            </div>
            <h2 className="relative mb-6 text-3xl">準備好開始了嗎？</h2>
            <p className="relative mb-10 text-xl leading-relaxed text-[#e8c9a0]">
              立即預約我們的服務，讓您的毛孩享受最安心的照護體驗。
            </p>
            <Link
              to="/booking"
              className="relative inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg text-[#6b3a2a] shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              立即預約 <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}

function ServiceDetailModal({
  service,
  onClose,
}: {
  service: (typeof services)[number];
  onClose: () => void;
}) {
  const Icon = service.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d1a0d]/35 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#f0e6df] bg-white shadow-2xl">
        <div className="relative h-56 overflow-hidden">
          <img
            src={service.image}
            alt={service.name}
            className="h-full w-full object-cover"
            style={{
              objectPosition: service.modalImagePosition || "center center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#6b3a2a] shadow-md hover:bg-white"
            aria-label="關閉服務詳細內容"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4 text-white">
            <div
              className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl ${service.iconBg} shadow-lg`}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <p className="mb-1 text-sm text-white/85">{service.label}</p>
              <h2 className="text-3xl">{service.name}</h2>
            </div>
          </div>
        </div>

        <div className="p-7">
          <p className="mb-6 text-base leading-relaxed text-gray-700">
            {service.description}
          </p>

          <div className="mb-6 rounded-3xl bg-[#fffaf7] p-5">
            <p className="mb-1 text-xs text-[#b87868]">適合對象</p>
            <p className="text-sm leading-relaxed text-gray-700">
              {service.detail.bestFor}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DetailList
              title="服務會包含"
              items={service.detail.includes}
              accent={service.accent}
            />
            <DetailList
              title="預約前可先準備"
              items={service.detail.prepare}
              accent={service.accent}
            />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to={service.link}
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#6b3a2a] py-3 text-white shadow-md transition-all hover:bg-[#8b5040]"
            >
              {service.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[#eadfd8] py-3 text-[#6b3a2a] hover:bg-[#faf7f4]"
            >
              先看看其他服務
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-sm leading-relaxed text-gray-700"
          >
            <CheckCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              style={{ color: accent }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] py-20">
      <div className="absolute left-8 top-10 text-8xl opacity-10">🐾</div>
      <div className="absolute bottom-8 right-10 text-8xl opacity-10">✨</div>
      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-[#6b3a2a] shadow-sm">
          <Sparkles className="h-4 w-4" />
          全方位毛孩照護
        </div>
        <h1 className="mb-6 text-5xl text-[#3d1a0d]">服務項目</h1>
        <p className="mx-auto max-w-2xl text-xl leading-relaxed text-[#6b3a2a]">
          從住宿、美容、日間托育到特殊照護，依照毛孩需求提供完整又安心的服務體驗。
        </p>
      </div>
    </section>
  );
}
