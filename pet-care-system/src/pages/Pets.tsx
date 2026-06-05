import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Plus,
  Edit,
  Trash2,
  X,
  PawPrint,
  Sparkles,
  Dog,
  Cat,
  Weight,
  Calendar,
  Heart,
  RefreshCcw,
  Check,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { API_BASE } from "../config";
import MemberBackButton from "../components/MemberBackButton";

const petImages = [
  {
    label: "狗狗 1",
    species: "狗",
    url: "/images/pets/dog-1.jpg",
    fallback: "🐶",
  },
  {
    label: "狗狗 2",
    species: "狗",
    url: "/images/pets/dog-2.jpg",
    fallback: "🐕",
  },
  {
    label: "狗狗 3",
    species: "狗",
    url: "/images/pets/dog-3.jpg",
    fallback: "🦮",
  },
  {
    label: "貓咪 1",
    species: "貓",
    url: "/images/pets/cat-1.jpg",
    fallback: "🐱",
  },
  {
    label: "貓咪 2",
    species: "貓",
    url: "/images/pets/cat-2.jpg",
    fallback: "🐈",
  },
  {
    label: "貓咪 3",
    species: "貓",
    url: "/images/pets/cat-3.jpg",
    fallback: "🐈‍⬛",
  },
  {
    label: "預設",
    species: "其他",
    url: "/images/pets/pet-default.jpg",
    fallback: "🐾",
  },
];

type Pet = {
  id: string;
  userId?: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  notes: string;
  imageUrl?: string;
  allergies?: string;
  medicalNotes?: string;
  vaccineDate?: string;
  vetName?: string;
  vetPhone?: string;
  emergencyContact?: string;
};

type PetForm = {
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  notes: string;
  imageUrl: string;
  allergies: string;
  medicalNotes: string;
  vaccineDate: string;
  vetName: string;
  vetPhone: string;
  emergencyContact: string;
};

const initial: PetForm = {
  name: "",
  species: "狗",
  breed: "",
  age: 0,
  weight: 0,
  gender: "公",
  notes: "",
  imageUrl: "/images/pets/dog-1.jpg",
  allergies: "",
  medicalNotes: "",
  vaccineDate: "",
  vetName: "",
  vetPhone: "",
  emergencyContact: "",
};

export default function Pets() {
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState<PetForm>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePetId, setDeletePetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadPets();
    } else {
      setPets([]);
      setLoading(false);
    }
  }, [user]);

  const loadPets = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

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

      setPets(data.pets || []);
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFormData(initial);
    setShowForm(false);
    setEditingPet(null);
  };

  const uploadPetImage = (file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("圖片請小於 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        toast.error("圖片讀取失敗");
        return;
      }

      setFormData((current) => ({
        ...current,
        imageUrl: result,
      }));
      toast.success("寵物照片已選擇");
    };
    reader.onerror = () => toast.error("圖片讀取失敗");
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("請先登入會員");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("請輸入寵物名稱");
      return;
    }

    if (!formData.breed.trim()) {
      toast.error("請輸入品種");
      return;
    }

    if (formData.age < 0) {
      toast.error("年齡不可小於 0");
      return;
    }

    if (formData.weight < 0) {
      toast.error("體重不可小於 0");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      const url = editingPet
        ? `${API_BASE}/pets/${editingPet.id}`
        : `${API_BASE}/pets`;

      const method = editingPet ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "儲存寵物資料失敗");
        return;
      }

      toast.success(editingPet ? "寵物資料已更新" : "寵物已新增");

      reset();
      await loadPets();
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    } finally {
      setSaving(false);
    }
  };

  const edit = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: Number(pet.age) || 0,
      weight: Number(pet.weight) || 0,
      gender: pet.gender,
      notes: pet.notes || "",
      allergies: pet.allergies || "",
      medicalNotes: pet.medicalNotes || "",
      vaccineDate: pet.vaccineDate || "",
      vetName: pet.vetName || "",
      vetPhone: pet.vetPhone || "",
      emergencyContact: pet.emergencyContact || "",
      imageUrl:
        pet.imageUrl ||
        (pet.species === "貓"
          ? "/images/pets/cat-1.jpg"
          : pet.species === "狗"
          ? "/images/pets/dog-1.jpg"
          : "/images/pets/pet-default.jpg"),
    });
    setShowForm(true);
  };

  const del = async (id: string) => {
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/pets/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "刪除寵物失敗");
        return;
      }

      toast.success("寵物已刪除");
      setDeletePetId(null);
      await loadPets();
    } catch (error) {
      console.error(error);
      toast.error("無法連線到後端，請確認 Flask 是否已啟動");
    } finally {
      setDeleting(false);
    }
  };

  const emoji = (species: string) =>
    species === "狗" ? "🐕" : species === "貓" ? "🐈" : "🐾";

  const IconFor = (species: string) =>
    species === "狗" ? Dog : species === "貓" ? Cat : PawPrint;

  const selectedImages = petImages.filter(
    (img) => img.species === formData.species || img.species === "其他"
  );
  const deletePet = pets.find((pet) => pet.id === deletePetId) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-[#f0e6df]">
          <div className="text-5xl mb-4">🐾</div>
          <p className="text-[#6b3a2a]">正在讀取寵物資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffefe]">
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8]">
        <div className="absolute left-8 top-10 text-8xl opacity-10">🐾</div>
        <div className="absolute right-10 bottom-8 text-8xl opacity-10">
          🐶
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="mb-6">
            <MemberBackButton />
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6">
              <Sparkles className="w-4 h-4" />
              毛孩資料管理
            </div>

            <h1 className="text-5xl mb-5 text-[#3d1a0d]">我的寵物</h1>

            <p className="text-xl text-[#6b3a2a] max-w-2xl leading-relaxed">
              建立毛孩的基本資料，方便我們安排住宿、美容與特殊照護需求。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadPets}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#6b3a2a] text-[#6b3a2a] rounded-full hover:bg-[#fdf0e0] transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
              重新整理
            </button>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                新增寵物
              </button>
            )}
          </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {showForm && (
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-10 border border-[#f0e6df]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm mb-2 text-[#b87868]">
                    {editingPet ? "EDIT PET" : "NEW PET"}
                  </p>
                  <h2 className="text-3xl text-[#3d1a0d]">
                    {editingPet ? "編輯寵物資料" : "新增寵物"}
                  </h2>
                </div>

                <button
                  onClick={reset}
                  className="w-10 h-10 rounded-full bg-[#faf7f4] text-gray-500 hover:text-[#6b3a2a] hover:bg-[#fdf0e0] transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submit} className="grid md:grid-cols-2 gap-5">
                <Field label="寵物名稱 *">
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-soft"
                    placeholder="例如：小Q、球球、咪咪"
                    required
                  />
                </Field>

                <Field label="物種 *">
                  <select
                    value={formData.species}
                    onChange={(e) => {
                      const species = e.target.value;
                      const defaultImage =
                        species === "貓"
                          ? "/images/pets/cat-1.jpg"
                          : species === "狗"
                          ? "/images/pets/dog-1.jpg"
                          : "/images/pets/pet-default.jpg";

                      setFormData({
                        ...formData,
                        species,
                        imageUrl: defaultImage,
                      });
                    }}
                    className="input-soft"
                  >
                    <option>狗</option>
                    <option>貓</option>
                    <option>其他</option>
                  </select>
                </Field>

                <Field label="品種 *">
                  <input
                    value={formData.breed}
                    onChange={(e) =>
                      setFormData({ ...formData, breed: e.target.value })
                    }
                    className="input-soft"
                    placeholder="例如：柴犬、貴賓、英短"
                    required
                  />
                </Field>

                <Field label="性別 *">
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="input-soft"
                  >
                    <option>公</option>
                    <option>母</option>
                  </select>
                </Field>

                <Field label="年齡（歲）*">
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: Number(e.target.value),
                      })
                    }
                    className="input-soft"
                    min="0"
                    required
                  />
                </Field>

                <Field label="體重（公斤）*">
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: Number(e.target.value),
                      })
                    }
                    className="input-soft"
                    min="0"
                    step="0.1"
                    required
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="選擇寵物照片">
                    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                      <div className="rounded-3xl border border-[#eadfd8] bg-[#fffaf6] p-4 shadow-[0_14px_34px_rgba(80,53,42,0.06)]">
                        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white">
                          {formData.imageUrl ? (
                            <img
                              src={formData.imageUrl}
                              alt="目前寵物照片"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-6xl">
                              {emoji(formData.species)}
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3d1a0d]/70 to-transparent p-4 text-white">
                            <p className="text-sm">目前照片</p>
                            <p className="text-xs text-white/75">可使用預設圖或自己上傳</p>
                          </div>
                        </div>

                        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#6b3a2a] px-4 py-3 text-sm text-white shadow-md transition hover:bg-[#8b5040]">
                          <Upload className="h-4 w-4" />
                          上傳照片
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => uploadPetImage(event.target.files?.[0])}
                          />
                        </label>
                        <p className="mt-2 text-center text-xs text-gray-500">
                          支援 JPG、PNG，建議小於 2MB
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                        {selectedImages.map((img) => {
                          const active = formData.imageUrl === img.url;

                          return (
                            <button
                              key={img.url}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  imageUrl: img.url,
                                })
                              }
                              className={`group relative overflow-hidden rounded-3xl border transition-all ${
                                active
                                  ? "border-[#6b3a2a] bg-[#fdf0e0] shadow-lg"
                                  : "border-[#eadfd8] bg-white hover:border-[#c8a97e] hover:shadow-md"
                              }`}
                            >
                              <div className="relative h-28 bg-[#fdf6f0]">
                                <img
                                  src={img.url}
                                  alt={img.label}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
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

                                <div className="hidden h-full w-full items-center justify-center text-5xl">
                                  {img.fallback}
                                </div>

                                {active && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-[#6b3a2a]/20">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
                                      <Check className="h-5 w-5 text-[#6b3a2a]" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="bg-white px-3 py-3 text-sm font-medium text-[#3d1a0d]">
                                {img.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Field>
                </div>

                <div className="md:col-span-2 rounded-3xl border border-[#f0e6df] bg-[#fff8f2] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#6b3a2a]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg text-[#3d1a0d]">健康與緊急資訊</h3>
                      <p className="text-xs text-gray-500">
                        住宿、美容與照護師會優先查看這些資料。
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="過敏資訊">
                      <input
                        value={formData.allergies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            allergies: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                        placeholder="例如：雞肉、牛肉、特定洗劑"
                      />
                    </Field>

                    <Field label="疫苗日期">
                      <input
                        type="date"
                        value={formData.vaccineDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vaccineDate: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                      />
                    </Field>

                    <Field label="常用獸醫院">
                      <input
                        value={formData.vetName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vetName: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                        placeholder="例如：安心動物醫院"
                      />
                    </Field>

                    <Field label="獸醫院電話">
                      <input
                        value={formData.vetPhone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vetPhone: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                        placeholder="例如：02-1234-5678"
                      />
                    </Field>

                    <Field label="緊急聯絡人">
                      <input
                        value={formData.emergencyContact}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                        placeholder="例如：王小明 0912-000-000"
                      />
                    </Field>

                    <Field label="疾病史 / 用藥需求">
                      <textarea
                        value={formData.medicalNotes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            medicalNotes: e.target.value,
                          })
                        }
                        className="input-soft bg-white"
                        rows={3}
                        placeholder="例如：心臟病、皮膚敏感、每日晚餐後吃藥"
                      />
                    </Field>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Field label="個性 / 照護備註">
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notes: e.target.value,
                        })
                      }
                      className="input-soft"
                      rows={4}
                      placeholder="例如：怕打雷、怕陌生人、喜歡慢慢接近等"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-7 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving
                      ? "儲存中..."
                      : editingPet
                      ? "儲存變更"
                      : "新增寵物"}
                  </button>

                  <button
                    type="button"
                    onClick={reset}
                    disabled={saving}
                    className="px-7 py-3 border border-[#eadfd8] text-gray-700 rounded-full hover:bg-[#faf7f4] transition-all disabled:opacity-60"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {pets.length === 0 && !showForm ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-[#f0e6df]">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#fdf0e0] flex items-center justify-center">
                <PawPrint className="w-10 h-10 text-[#6b3a2a]" />
              </div>

              <h2 className="text-3xl mb-4 text-[#3d1a0d]">
                還沒有新增寵物資料
              </h2>

              <p className="text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
                先新增第一隻毛孩的資料，之後預約住宿或美容服務時就可以直接選擇。
              </p>

              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                新增第一隻寵物
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pets.map((pet) => {
                const Icon = IconFor(pet.species);
                const imageUrl =
                  pet.imageUrl ||
                  (pet.species === "貓"
                    ? "/images/pets/cat-1.jpg"
                    : pet.species === "狗"
                    ? "/images/pets/dog-1.jpg"
                    : "/images/pets/pet-default.jpg");

                return (
                  <div
                    key={pet.id}
                    className="group bg-white rounded-3xl shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-[#f0e6df] overflow-hidden"
                  >
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-[#fdf6f0] to-[#f3e4d7]">
                      <img
                        src={imageUrl}
                        alt={pet.name}
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

                      <div className="hidden w-full h-full items-center justify-center text-7xl">
                        {emoji(pet.species)}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent"></div>

                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/85 text-xs text-[#6b3a2a] shadow-sm">
                        {pet.species}
                      </div>

                      <div className="absolute left-5 bottom-5 text-white">
                        <h3 className="text-2xl mb-1 drop-shadow">
                          {pet.name}
                        </h3>
                        <p className="text-sm text-white/90 drop-shadow">
                          {pet.breed}
                        </p>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <Mini
                          icon={<Icon className="w-4 h-4 text-[#6b3a2a]" />}
                          label="物種"
                          value={pet.species}
                        />
                        <Mini
                          icon={<Heart className="w-4 h-4 text-[#b87868]" />}
                          label="性別"
                          value={pet.gender}
                        />
                        <Mini
                          icon={<Calendar className="w-4 h-4 text-[#6f9fc2]" />}
                          label="年齡"
                          value={`${pet.age} 歲`}
                        />
                        <Mini
                          icon={<Weight className="w-4 h-4 text-[#5f8a5f]" />}
                          label="體重"
                          value={`${pet.weight} kg`}
                        />
                      </div>

                      {pet.notes && (
                        <div className="mb-5 p-4 bg-[#fff8f2] border border-[#f0e6df] rounded-2xl">
                          <p className="text-xs text-gray-500 mb-1">備註</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {pet.notes}
                          </p>
                        </div>
                      )}

                      {(pet.allergies ||
                        pet.medicalNotes ||
                        pet.vaccineDate ||
                        pet.emergencyContact) && (
                        <div className="mb-5 rounded-2xl border border-[#f0e6df] bg-[#fbfff8] p-4">
                          <p className="mb-2 flex items-center gap-1 text-xs text-[#6b3a2a]">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            健康提醒
                          </p>
                          <div className="space-y-1 text-sm text-gray-700">
                            {pet.allergies && <p>過敏：{pet.allergies}</p>}
                            {pet.medicalNotes && <p>照護：{pet.medicalNotes}</p>}
                            {pet.vaccineDate && <p>疫苗：{pet.vaccineDate}</p>}
                            {pet.emergencyContact && (
                              <p>緊急聯絡：{pet.emergencyContact}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => edit(pet)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 border border-[#6b3a2a] text-[#6b3a2a] rounded-full hover:bg-[#6b3a2a] hover:text-white transition-all text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          編輯
                        </button>

                        <button
                          onClick={() => setDeletePetId(pet.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 border border-[#b87868] text-[#b87868] rounded-full hover:bg-[#fff0f0] transition-all text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deletePet)}
        title="刪除此寵物資料？"
        description={
          deletePet
            ? `「${deletePet.name}」的資料刪除後無法從畫面復原。若已有歷史訂單，建議先確認不再需要這筆資料。`
            : ""
        }
        confirmText="刪除寵物"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeletePetId(null)}
        onConfirm={() => {
          if (deletePet) {
            del(deletePet.id);
          }
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm mb-2 text-[#3d1a0d]">{label}</label>
      {children}
    </div>
  );
}

function Mini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#faf7f4] p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
