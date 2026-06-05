import { useState, useEffect } from "react";
import type { ReactNode, ReactElement } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router";
import {
  Calendar as CalendarIcon,
  PawPrint,
  Home,
  Scissors,
  FileText,
  CreditCard,
  ArrowRight,
  RefreshCcw,
  Plus,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { API_BASE } from "../config";
import {
  defaultServiceCatalog,
  fetchPublicSystemSettings,
  priceText,
  type GroomingService,
  type RoomType,
  type ServiceCatalog,
} from "../systemSettings";
import MemberBackButton from "../components/MemberBackButton";

interface Pet {
  id: string;
  userId?: string;
  name: string;
  species: string;
  breed: string;
  age?: number;
  weight?: number;
  gender?: string;
  notes?: string;
}

type ServiceType = "accommodation" | "grooming";

type GroomingSlot = {
  time: string;
  capacity: number;
  booked: number;
  remaining: number;
};

export default function Booking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [reloadingPets, setReloadingPets] = useState(false);
  const [serviceCatalog, setServiceCatalog] =
    useState<ServiceCatalog>(defaultServiceCatalog);
  const [groomingSlots, setGroomingSlots] = useState<GroomingSlot[]>([]);
  const [loadingGroomingSlots, setLoadingGroomingSlots] = useState(false);

  const [formData, setFormData] = useState({
    serviceType: "accommodation" as ServiceType,
    petId: "",
    roomType: "standard" as RoomType,
    groomingService: "basic" as GroomingService,
    scheduledTime: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    addOnItems: [] as string[],
    notes: "",
  });

  const loadPetsFromApi = async (showToast = false) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("請先登入會員");
        navigate("/login");
        return;
      }

      if (showToast) {
        setReloadingPets(true);
      } else {
        setLoadingPets(true);
      }

      const response = await fetch(`${API_BASE}/pets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "讀取寵物資料失敗");
        return;
      }

      const petList: Pet[] = data.pets || [];
      setPets(petList);

      setFormData((prev) => {
        const petIdFromQuery = searchParams.get("petId") || "";
        const serviceFromQuery = searchParams.get("service");
        const requestedPetExists = petList.some(
          (pet) => pet.id === petIdFromQuery
        );
        const requestedService =
          serviceFromQuery === "grooming" ||
          serviceFromQuery === "accommodation"
            ? serviceFromQuery
            : prev.serviceType;
        const currentPetStillExists = petList.some(
          (pet) => pet.id === prev.petId
        );

        return {
          ...prev,
          serviceType: requestedService,
          petId:
            requestedPetExists
              ? petIdFromQuery
              : currentPetStillExists
              ? prev.petId
              : petList.length > 0
              ? petList[0].id
              : "",
        };
      });

      if (showToast) {
        toast.success(`已重新讀取寵物資料，共 ${petList.length} 筆`);
      }
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    } finally {
      setLoadingPets(false);
      setReloadingPets(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoadingPets(false);
      return;
    }

    loadPetsFromApi();
  }, [user]);

  useEffect(() => {
    fetchPublicSystemSettings()
      .then((settings) => setServiceCatalog(settings.serviceCatalog))
      .catch((error) => {
        console.error("讀取系統設定失敗", error);
      });
  }, []);

  useEffect(() => {
    if (formData.serviceType !== "grooming") return;

    async function loadGroomingSlots() {
      try {
        setLoadingGroomingSlots(true);
        const response = await fetch(
          `${API_BASE}/availability/grooming?date=${formData.startDate}`
        );
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.message || "讀取美容時段失敗");
          return;
        }

        const slots: GroomingSlot[] = data.slots || [];
        setGroomingSlots(slots);
        setFormData((current) => {
          const currentSlot = slots.find(
            (slot) => slot.time === current.scheduledTime && slot.remaining > 0
          );
          const firstAvailable = slots.find((slot) => slot.remaining > 0);

          return {
            ...current,
            scheduledTime: currentSlot
              ? current.scheduledTime
              : firstAvailable?.time || "",
          };
        });
      } catch (error) {
        console.error(error);
        toast.error("無法讀取美容時段，請確認後端是否已啟動");
      } finally {
        setLoadingGroomingSlots(false);
      }
    }

    loadGroomingSlots();
  }, [formData.serviceType, formData.startDate]);

  const roomNames: Record<RoomType, string> = {
    standard: "豪華單人房",
    deluxe: "舒適雙人房",
    vip: "VIP總統套房",
  };

  const groomingNames: Record<GroomingService, string> = {
    basic: "基礎洗澡護理",
    styling: "造型剪毛設計",
    spa: "SPA深層護理",
  };

  const days = () =>
    Math.max(
      1,
      Math.ceil(
        (new Date(formData.endDate).getTime() -
          new Date(formData.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

  const total = () =>
    baseAmount() + addOnTotal();

  const baseAmount = () =>
    formData.serviceType === "accommodation"
      ? serviceCatalog.roomPrices[formData.roomType] * days()
      : serviceCatalog.groomingPrices[formData.groomingService];

  const addOnOptions = Object.values(serviceCatalog.addOnServices);
  const selectedAddOns = addOnOptions.filter((option) =>
    formData.addOnItems.includes(option.id)
  );
  const addOnTotal = () =>
    selectedAddOns.reduce((sum, option) => sum + option.price, 0);

  const toggleAddOn = (id: string) => {
    setFormData((current) => ({
      ...current,
      addOnItems: current.addOnItems.includes(id)
        ? current.addOnItems.filter((item) => item !== id)
        : [...current.addOnItems, id],
    }));
  };

  const selectedPet = pets.find((p) => p.id === formData.petId);
  const roomOptions: Array<{
    id: RoomType;
    name: string;
    description: string;
    detail: string;
  }> = [
    {
      id: "standard",
      name: roomNames.standard,
      description: "適合小型犬貓",
      detail: "獨立休息區、定時巡房",
    },
    {
      id: "deluxe",
      name: roomNames.deluxe,
      description: "適合中型犬或雙寵",
      detail: "加大空間、舒適睡墊",
    },
    {
      id: "vip",
      name: roomNames.vip,
      description: "高隱私照護套房",
      detail: "專屬照護紀錄、優先回報",
    },
  ];
  const groomingOptions: Array<{
    id: GroomingService;
    name: string;
    description: string;
    detail: string;
  }> = [
    {
      id: "basic",
      name: groomingNames.basic,
      description: "日常清潔保養",
      detail: "洗澡、吹整、基礎整理",
    },
    {
      id: "styling",
      name: groomingNames.styling,
      description: "造型與修剪",
      detail: "依毛孩體型與毛量調整",
    },
    {
      id: "spa",
      name: groomingNames.spa,
      description: "深層護理",
      detail: "適合皮毛保養與放鬆",
    },
  ];
  const hasSchedule =
    formData.serviceType === "accommodation"
      ? Boolean(formData.startDate && formData.endDate) &&
        new Date(formData.endDate) > new Date(formData.startDate)
      : Boolean(formData.startDate && formData.scheduledTime);
  const bookingStep = hasSchedule ? 4 : formData.petId ? 3 : 2;
  const bookingSteps = [
    { number: 1, label: "服務" },
    { number: 2, label: "寵物" },
    { number: 3, label: formData.serviceType === "accommodation" ? "房型" : "時段" },
    { number: 4, label: "確認" },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("請先登入會員");
      navigate("/login");
      return;
    }

    if (!formData.petId) {
      toast.error("請先新增寵物資料");
      navigate("/pets");
      return;
    }

    const petExists = pets.some((pet) => pet.id === formData.petId);

    if (!petExists) {
      toast.error("找不到這筆寵物資料，請重新讀取寵物資料");
      return;
    }

    if (formData.serviceType === "accommodation") {
      if (new Date(formData.endDate) <= new Date(formData.startDate)) {
        toast.error("退房日期必須晚於入住日期");
        return;
      }
    } else if (!formData.scheduledTime) {
      toast.error("請選擇美容預約時段");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "預約失敗");
        return;
      }

      toast.success("預約成功！我們將盡快與您聯繫確認");
      navigate("/orders");
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    }
  };

  if (loadingPets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-[#f0e6df]">
          <div className="text-5xl mb-4">🐾</div>
          <p className="text-[#6b3a2a]">正在讀取寵物資料...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={<PawPrint className="w-10 h-10 text-[#6b3a2a]" />}
        title="請先登入會員"
        description="登入後才能讀取你的寵物資料並進行預約。"
        buttonText="前往登入"
        onClick={() => navigate("/login")}
      />
    );
  }

  if (pets.length === 0) {
    return (
      <EmptyState
        icon={<PawPrint className="w-10 h-10 text-[#6b3a2a]" />}
        title="請先新增寵物資料"
        description="在預約住宿或美容服務之前，需要先建立毛孩的基本資料。"
        buttonText="前往新增寵物"
        onClick={() => navigate("/pets")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8]">
        <div className="absolute left-8 top-10 text-8xl opacity-10">🐾</div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10">
          📅
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="mb-6">
            <MemberBackButton />
          </div>
          <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6">
            <CalendarIcon className="w-4 h-4" />
            線上預約
          </div>

          <h1 className="text-5xl mb-6 text-[#3d1a0d]">預約服務</h1>

          <p className="text-xl text-[#6b3a2a] max-w-2xl mx-auto leading-relaxed">
            選擇毛孩需要的服務，我們將為您安排最合適的照護時段。
          </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <form
            onSubmit={submit}
            className="grid lg:grid-cols-3 gap-8 items-start"
          >
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-[#f0e6df] p-8">
              <BookingProgress steps={bookingSteps} currentStep={bookingStep} />

              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#fdf0e0] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#6b3a2a]" />
                    </div>
                    <label className="text-lg text-[#3d1a0d]">
                      服務類型 *
                    </label>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <ServiceButton
                      active={formData.serviceType === "accommodation"}
                      icon={<Home />}
                      title="寵物住宿"
                      desc="依房型與住宿天數計費"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          serviceType: "accommodation",
                        })
                      }
                    />

                    <ServiceButton
                      active={formData.serviceType === "grooming"}
                      rose
                      icon={<Scissors />}
                      title="美容服務"
                      desc="洗澡、剪毛與深層護理"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          serviceType: "grooming",
                        })
                      }
                    />
                  </div>
                </div>

                <Field
                  label="選擇寵物 *"
                  action={
                    <button
                      type="button"
                      onClick={() => loadPetsFromApi(true)}
                      disabled={reloadingPets}
                      className="inline-flex items-center gap-1 text-xs text-[#6b3a2a] hover:underline disabled:opacity-50"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      {reloadingPets ? "讀取中..." : "重新讀取"}
                    </button>
                  }
                >
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {pets.map((pet) => {
                      const active = formData.petId === pet.id;
                      const petMeta = [
                        pet.age ? `${pet.age} 歲` : "",
                        pet.weight ? `${pet.weight} kg` : "",
                        pet.gender || "",
                      ].filter(Boolean);

                      return (
                        <button
                          key={pet.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, petId: pet.id })
                          }
                          className={`group rounded-2xl border px-3 py-3 text-left transition-all ${
                            active
                              ? "border-[#6b3a2a] bg-[#fdf6f0] shadow-md"
                              : "border-[#eadfd8] bg-white hover:border-[#c8a97e] hover:bg-[#fffaf6]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                                active
                                  ? "bg-[#6b3a2a] text-white"
                                  : "bg-[#f3e4d7] text-[#6b3a2a]"
                              }`}
                            >
                              <PawPrint className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm text-[#3d1a0d]">
                                  {pet.name}
                                </p>
                                {active && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6b3a2a]" />
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-gray-500">
                                {pet.species} / {pet.breed || "未填品種"}
                              </p>
                              {petMeta.length > 0 && (
                                <p className="mt-1 truncate text-xs text-gray-400">
                                  {petMeta.join(" / ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/pets")}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#fdf6f0] px-3.5 py-2 text-sm text-[#6b3a2a] transition-all hover:bg-[#f3e4d7]"
                  >
                    <Plus className="w-4 h-4" />
                    新增或管理寵物
                  </button>
                </Field>

                {formData.serviceType === "accommodation" ? (
                  <>
                    <Field label="房型 *">
                      <div className="grid gap-3">
                        {roomOptions.map((room) => {
                          const active = formData.roomType === room.id;

                          return (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  roomType: room.id,
                                })
                              }
                              className={`rounded-3xl border p-4 text-left transition-all ${
                                active
                                  ? "border-[#6b3a2a] bg-[#fdf6f0] shadow-md"
                                  : "border-[#eadfd8] bg-white hover:border-[#c8a97e] hover:bg-[#fffaf6]"
                              }`}
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                      active
                                        ? "bg-[#6b3a2a] text-white"
                                        : "bg-[#f3e4d7] text-[#6b3a2a]"
                                    }`}
                                  >
                                    <Home className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-base text-[#3d1a0d]">
                                        {room.name}
                                      </p>
                                      {active && (
                                        <CheckCircle2 className="h-4 w-4 text-[#6b3a2a]" />
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                      {room.description}
                                    </p>
                                    <p className="mt-2 text-xs text-gray-500">
                                      {room.detail}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex min-w-[10rem] items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
                                  <p className="text-xs text-gray-500">
                                    每晚
                                  </p>
                                  <p className="whitespace-nowrap text-lg text-[#6b3a2a]">
                                    {priceText(
                                      serviceCatalog.roomPrices[room.id],
                                    )}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="入住日期 *">
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                            })
                          }
                          min={format(new Date(), "yyyy-MM-dd")}
                          className="input-soft"
                          required
                        />
                      </Field>

                      <Field label="退房日期 *">
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            })
                          }
                          min={formData.startDate}
                          className="input-soft"
                          required
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="美容服務 *">
                      <div className="grid gap-3">
                        {groomingOptions.map((service) => {
                          const active =
                            formData.groomingService === service.id;

                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  groomingService: service.id,
                                })
                              }
                              className={`rounded-3xl border p-4 text-left transition-all ${
                                active
                                  ? "border-[#b87868] bg-[#fff5f2] shadow-md"
                                  : "border-[#eadfd8] bg-white hover:border-[#c8a97e] hover:bg-[#fffaf6]"
                              }`}
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                      active
                                        ? "bg-[#b87868] text-white"
                                        : "bg-[#f3e4d7] text-[#6b3a2a]"
                                    }`}
                                  >
                                    <Scissors className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-base text-[#3d1a0d]">
                                        {service.name}
                                      </p>
                                      {active && (
                                        <CheckCircle2 className="h-4 w-4 text-[#b87868]" />
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                      {service.description}
                                    </p>
                                    <p className="mt-2 text-xs text-gray-500">
                                      {service.detail}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex min-w-[9.5rem] items-center justify-between gap-4 rounded-2xl border border-[#f0e6df] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(80,53,42,0.08)]">
                                  <p className="rounded-full bg-[#fff5f2] px-2.5 py-1 text-xs font-medium text-[#b87868]">
                                    起價
                                  </p>
                                  <p className="whitespace-nowrap text-xl font-semibold text-[#6b3a2a]">
                                    {priceText(
                                      serviceCatalog.groomingPrices[
                                        service.id
                                      ],
                                    )}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <Field label="預約日期 *">
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                        min={format(new Date(), "yyyy-MM-dd")}
                        className="input-soft"
                        required
                      />
                    </Field>

                    <Field label="美容時段 *">
                      <div className="relative">
                        <select
                          value={formData.scheduledTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              scheduledTime: e.target.value,
                            })
                          }
                          className="h-14 w-full appearance-none rounded-3xl border border-[#eadfd8] bg-[#fffaf6] px-5 pr-14 text-base font-semibold text-[#3d1a0d] shadow-[0_12px_28px_rgba(80,53,42,0.06)] outline-none transition hover:border-[#c8a97e] focus:border-[#6b3a2a] focus:bg-white focus:ring-4 focus:ring-[#f4ebe5]"
                          required
                        >
                          {loadingGroomingSlots ? (
                            <option value="">讀取時段中...</option>
                          ) : groomingSlots.length === 0 ? (
                            <option value="">目前沒有可預約時段</option>
                          ) : (
                            groomingSlots.map((slot) => (
                              <option
                                key={slot.time}
                                value={slot.time}
                                disabled={slot.remaining <= 0}
                              >
                                {slot.time}（剩 {slot.remaining} / {slot.capacity}）
                              </option>
                            ))
                          )}
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-[#6b3a2a] shadow-sm">
                          <ChevronDown className="h-5 w-5" />
                        </span>
                      </div>
                    </Field>
                  </>
                )}

                <Field label="加購服務">
                  <div className="grid md:grid-cols-2 gap-3">
                    {addOnOptions.map((option) => {
                      const checked = formData.addOnItems.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleAddOn(option.id)}
                          className={`rounded-3xl border p-4 text-left transition-all ${
                            checked
                              ? "border-[#6b3a2a] bg-[#fdf6f0] shadow-md"
                              : "border-[#eadfd8] bg-white hover:border-[#c8a97e] hover:bg-[#fff8f2]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm text-[#3d1a0d]">
                                {option.name}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                                {option.description}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs ${
                                checked
                                  ? "bg-[#6b3a2a] text-white"
                                  : "bg-[#faf7f4] text-[#6b3a2a]"
                              }`}
                            >
                              + {priceText(option.price)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="備註">
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="input-soft"
                    rows={4}
                    placeholder="有特殊飲食、害怕陌生人、皮膚狀況或其他需求，都可以先告訴我們"
                  />
                </Field>
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl shadow-xl border border-[#f0e6df] overflow-hidden">
                <div className="bg-gradient-to-br from-[#fdf6f0] to-[#f3e4d7] p-6">
                  <div className="flex items-center gap-2 mb-3 text-[#6b3a2a]">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm">預約摘要</span>
                  </div>

                  <h2 className="text-2xl text-[#3d1a0d]">
                    {formData.serviceType === "accommodation"
                      ? "寵物住宿"
                      : "美容服務"}
                  </h2>

                  <p className="text-sm text-[#6b3a2a] mt-1">
                    {selectedPet
                      ? `${selectedPet.name}（${selectedPet.species}）`
                      : "尚未選擇寵物"}
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  <Row
                    label="服務項目"
                    value={
                      formData.serviceType === "accommodation"
                        ? roomNames[formData.roomType]
                        : groomingNames[formData.groomingService]
                    }
                  />

                  {formData.serviceType === "accommodation" ? (
                    <>
                      <Row label="入住日期" value={formData.startDate} />
                      <Row label="退房日期" value={formData.endDate} />
                      <Row label="住宿天數" value={`${days()} 晚`} />
                    </>
                  ) : (
                    <>
                      <Row label="預約日期" value={formData.startDate} />
                      <Row
                        label="美容時段"
                        value={formData.scheduledTime || "尚未選擇"}
                      />
                    </>
                  )}

                  <div className="rounded-3xl border border-[#f0e6df] bg-[#fffaf6] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-[#3d1a0d]">費用明細</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">
                        預估
                      </span>
                    </div>
                    <div className="space-y-3">
                      <PriceRow
                        label={
                          formData.serviceType === "accommodation"
                            ? `${roomNames[formData.roomType]} x ${days()} 晚`
                            : groomingNames[formData.groomingService]
                        }
                        value={priceText(baseAmount())}
                      />

                      {selectedAddOns.length > 0 ? (
                        selectedAddOns.map((option) => (
                          <PriceRow
                            key={option.id}
                            label={option.name}
                            value={`+ ${priceText(option.price)}`}
                            muted
                          />
                        ))
                      ) : (
                        <PriceRow label="加購服務" value="未加購" muted />
                      )}

                      <div className="border-t border-[#eadfd8] pt-3">
                        <PriceRow
                          label="加購小計"
                          value={priceText(addOnTotal())}
                          muted
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-[#6b3a2a] px-5 py-6 text-center text-white shadow-lg">
                    <p className="text-sm text-white/75">預估總金額</p>
                    <div className="mt-2 flex items-baseline justify-center gap-2">
                      <span className="text-2xl tracking-wide">NT$</span>
                      <span className="text-5xl leading-none">
                        {total().toLocaleString()}
                      </span>
                    </div>
                    <p className="mx-auto mt-3 max-w-[15rem] text-xs leading-relaxed text-white/65">
                      送出後由店務確認最終價格
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg"
                    >
                      確認預約
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
                      * 實際價格可能因寵物體型、毛量等因素有所調整
                      <br />
                      * 提交預約後，我們將與您聯繫確認詳細資訊
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-[#f0e6df]">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#fdf0e0] flex items-center justify-center">
            {icon}
          </div>

          <h2 className="text-3xl mb-4 text-[#3d1a0d]">{title}</h2>

          <p className="text-gray-600 mb-8 leading-relaxed">{description}</p>

          <button
            onClick={onClick}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg"
          >
            {buttonText}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingProgress({
  steps,
  currentStep,
}: {
  steps: Array<{ number: number; label: string }>;
  currentStep: number;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-[#f0e6df] bg-[#fffaf6] px-5 py-3">
      <div className="flex justify-center">
        <div className="inline-flex items-start">
        {steps.map((step, index) => {
          const completed = step.number < currentStep;
          const active = step.number === currentStep;

          return (
            <div key={step.number} className="flex items-start">
              <div className="flex w-14 flex-col items-center gap-1.5 sm:w-16">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all ${
                    completed || active
                      ? "border-[#6b3a2a] bg-[#6b3a2a] text-white"
                      : "border-[#eadfd8] bg-white text-gray-400"
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`text-xs ${
                    completed || active ? "text-[#6b3a2a]" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-1 mt-3.5 h-px w-12 rounded-full sm:mx-2 sm:w-24 ${
                    completed ? "bg-[#6b3a2a]" : "bg-[#eadfd8]"
                  }`}
                />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label className="block text-sm text-[#3d1a0d]">{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function PriceRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span
        className={`min-w-0 leading-relaxed ${
          muted ? "text-gray-500" : "text-[#3d1a0d]"
        }`}
      >
        {label}
      </span>
      <span
        className={`shrink-0 text-right leading-relaxed ${
          muted ? "text-gray-500" : "font-medium text-[#6b3a2a]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ServiceButton({
  active,
  rose = false,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  rose?: boolean;
  icon: ReactElement;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group p-5 border-2 rounded-3xl transition-all text-left ${
        active
          ? rose
            ? "border-[#b87868] bg-[#fff5f2] shadow-md"
            : "border-[#6b3a2a] bg-[#fdf6f0] shadow-md"
          : "border-[#eadfd8] hover:border-[#c8a97e] hover:bg-[#fff8f2]"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            active
              ? rose
                ? "bg-[#b87868] text-white"
                : "bg-[#6b3a2a] text-white"
              : "bg-[#f3e4d7] text-[#6b3a2a]"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-lg text-[#3d1a0d]">{title}</p>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
    </button>
  );
}
