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
  ImageIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../components/ConfirmDialog";
import { API_BASE } from "../config";

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

        <div className="max-w-7xl mx-auto px-4 relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                            className={`relative overflow-hidden rounded-3xl border-2 transition-all ${
                              active
                                ? "border-[#6b3a2a] shadow-lg scale-[1.02]"
                                : "border-[#eadfd8] hover:border-[#c8a97e]"
                            }`}
                          >
                            <div className="relative h-32 bg-[#fdf6f0]">
                              <img
                                src={img.url}
                                alt={img.label}
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

                              <div className="hidden w-full h-full items-center justify-center text-5xl">
                                {img.fallback}
                              </div>

                              {active && (
                                <div className="absolute inset-0 bg-[#6b3a2a]/25 flex items-center justify-center">
                                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                                    <Check className="w-5 h-5 text-[#6b3a2a]" />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="bg-white px-3 py-2 text-sm text-[#3d1a0d]">
                              {img.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      目前先提供預設照片選擇，之後也可以再升級成上傳照片功能。
                    </p>
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="備註（過敏、特殊需求等）">
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
                      placeholder="例如：對雞肉過敏、怕打雷、需要特別照顧等"
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
