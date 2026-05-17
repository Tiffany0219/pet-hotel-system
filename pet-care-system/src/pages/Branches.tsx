import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock,
  ExternalLink,
  Mail,
  Map,
  MapPin,
  Navigation,
  Phone,
  Scissors,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  defaultBusinessSettings,
  fetchPublicSystemSettings,
  type BusinessSettings,
} from "../systemSettings";

type Branch = {
  name: string;
  tag: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  image: string;
  services: string[];
  transport: string;
  features: string[];
};

const branches: Branch[] = [
  {
    name: "毛孩樂園 高雄總店",
    tag: "住宿 / 美容 / 照護",
    address: "高雄市前金區中正四路 88 號",
    phone: "07-123-4567",
    email: "kaohsiung@petcare.test",
    hours: "09:00 - 21:00",
    image: "/images/hero-pet.jpg",
    services: ["寵物住宿", "美容洗護", "照護回報", "健康觀察"],
    transport: "捷運市議會站步行 6 分鐘，附近有合作停車場。",
    features: ["24H 空調", "獨立住宿區", "即時照護紀錄"],
  },
  {
    name: "毛孩樂園 北屯住宿館",
    tag: "住宿專門館",
    address: "台中市北屯區崇德路三段 168 號",
    phone: "04-2222-8899",
    email: "beitun@petcare.test",
    hours: "08:30 - 21:30",
    image: "/images/room-deluxe.jpg",
    services: ["寵物住宿", "長住照護", "散步服務", "特殊飲食協助"],
    transport: "近捷運文心崇德站，門口可臨停接送。",
    features: ["大型犬友善", "分區活動空間", "長住方案"],
  },
  {
    name: "毛孩樂園 左營美容館",
    tag: "美容專門館",
    address: "高雄市左營區裕誠路 256 號",
    phone: "07-555-2020",
    email: "zuoying@petcare.test",
    hours: "10:00 - 20:00",
    image: "/images/grooming-spa.jpg",
    services: ["基礎洗澡", "造型剪毛", "SPA 深層護理", "皮毛保養"],
    transport: "近巨蛋商圈，距捷運巨蛋站步行 8 分鐘。",
    features: ["預約制美容", "敏感肌照護", "造型諮詢"],
  },
];

export default function Branches() {
  const [selectedBranchName, setSelectedBranchName] = useState(branches[0].name);
  const [businessSettings, setBusinessSettings] =
    useState<BusinessSettings>(defaultBusinessSettings);

  useEffect(() => {
    fetchPublicSystemSettings()
      .then((settings) => setBusinessSettings(settings.businessSettings))
      .catch((error) => {
        console.error("讀取系統設定失敗", error);
      });
  }, []);

  const displayHours = `平日 ${businessSettings.weekdayHours} / 假日 ${businessSettings.weekendHours}`;
  const visibleBranches = useMemo(
    () => branches.map((branch) => ({ ...branch, hours: displayHours })),
    [displayHours]
  );
  const selectedBranch =
    visibleBranches.find((branch) => branch.name === selectedBranchName) ||
    visibleBranches[0];

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="relative overflow-hidden bg-[#fdf6f0]">
        <div className="absolute inset-0">
          <img
            src="/images/hero-pet.jpg"
            alt="毛孩樂園分店資訊"
            className="h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2]/95 to-[#f5ede8]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-[#6b3a2a] shadow-sm">
              <Building2 className="h-4 w-4" />
              分店資訊
            </div>

            <h1 className="text-4xl leading-tight text-[#3d1a0d] md:text-5xl">
              選擇離你最近的毛孩照護據點
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#6b3a2a]">
              每間分店都提供清楚的服務項目、接送資訊與聯絡方式，方便會員預約住宿、美容與照護服務。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleBranches.map((branch) => (
            <BranchCard
              key={branch.name}
              branch={branch}
              active={selectedBranch.name === branch.name}
              onSelect={() => setSelectedBranchName(branch.name)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="overflow-hidden rounded-2xl border border-[#f0e6df] bg-white shadow-sm">
          <div className="grid lg:grid-cols-[360px_1fr]">
            <div className="border-b border-[#f0e6df] p-5 lg:border-b-0 lg:border-r">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fdf0e0] text-[#6b3a2a]">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">地圖與導航</p>
                  <h2 className="text-xl text-[#3d1a0d]">
                    {selectedBranch.name}
                  </h2>
                </div>
              </div>

              <div className="space-y-2">
                {visibleBranches.map((branch) => (
                  <button
                    key={branch.name}
                    type="button"
                    onClick={() => setSelectedBranchName(branch.name)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      selectedBranch.name === branch.name
                        ? "border-[#6b3a2a] bg-[#fdf6f0] text-[#3d1a0d]"
                        : "border-[#f0e6df] text-gray-600 hover:bg-[#faf7f4]"
                    }`}
                  >
                    <p className="text-sm">{branch.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {branch.address}
                    </p>
                  </button>
                ))}
              </div>

              <a
                href={googleMapsUrl(selectedBranch)}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6b3a2a] px-4 py-3 text-sm text-white transition-all hover:bg-[#8b5040]"
              >
                <Navigation className="h-4 w-4" />
                開啟 Google 地圖導航
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="h-[420px] bg-[#faf7f4]">
              <iframe
                key={selectedBranch.address}
                title={`${selectedBranch.name} 地圖`}
                src={googleMapsEmbedUrl(selectedBranch)}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#f0e6df] bg-[#faf7f4]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm text-[#b87868]">SERVICE NOTE</p>
            <h2 className="mt-2 text-3xl text-[#3d1a0d]">預約前的小提醒</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              住宿與美容服務建議提前預約。若毛孩有特殊飲食、用藥、皮膚敏感或行為需求，請在預約備註中填寫，分店人員會依需求安排照護。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoBadge
              icon={<ShieldCheck className="h-5 w-5" />}
              title="分區照護"
              text="住宿與美容動線分流"
            />
            <InfoBadge
              icon={<Star className="h-5 w-5" />}
              title="紀錄同步"
              text="店家照護回報可在訂單查看"
            />
            <InfoBadge
              icon={<Scissors className="h-5 w-5" />}
              title="預約制"
              text="美容時段由店務人員安排"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function BranchCard({
  branch,
  active,
  onSelect,
}: {
  branch: Branch;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
        active ? "border-[#6b3a2a] ring-2 ring-[#fdf0e0]" : "border-[#f0e6df]"
      }`}
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={branch.image}
          alt={branch.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-[#6b3a2a]">
            {branch.tag}
          </span>
          <h2 className="mt-3 text-2xl text-white drop-shadow">{branch.name}</h2>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="space-y-3 text-sm text-gray-600">
          <DetailRow icon={<MapPin className="h-4 w-4" />} text={branch.address} />
          <DetailRow icon={<Phone className="h-4 w-4" />} text={branch.phone} />
          <DetailRow icon={<Mail className="h-4 w-4" />} text={branch.email} />
          <DetailRow icon={<Clock className="h-4 w-4" />} text={branch.hours} />
          <DetailRow
            icon={<Navigation className="h-4 w-4" />}
            text={branch.transport}
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-500">服務項目</p>
          <div className="flex flex-wrap gap-2">
            {branch.services.map((service) => (
              <span
                key={service}
                className="rounded-full bg-[#fdf6f0] px-3 py-1 text-xs text-[#6b3a2a]"
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#faf7f4] p-4">
          <p className="mb-2 text-xs text-gray-500">分店特色</p>
          <div className="space-y-2">
            {branch.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-[#3d1a0d]">
                <Star className="h-3.5 w-3.5 text-[#c8a15f]" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSelect}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#6b3a2a] px-4 py-3 text-sm text-[#6b3a2a] transition-all hover:bg-[#fdf6f0]"
        >
          <MapPin className="h-4 w-4" />
          查看地圖
        </button>
      </div>
    </article>
  );
}

function googleMapsUrl(branch: Branch) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    branch.address
  )}`;
}

function googleMapsEmbedUrl(branch: Branch) {
  return `https://www.google.com/maps?q=${encodeURIComponent(
    branch.address
  )}&output=embed`;
}

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#b87868]">{icon}</span>
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

function InfoBadge({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f0e6df] bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf0e0] text-[#6b3a2a]">
        {icon}
      </div>
      <h3 className="text-[#3d1a0d]">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </div>
  );
}
