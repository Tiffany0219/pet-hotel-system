import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  PawPrint,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

const testAccounts = [
  "會員 demo@test.com / demo123",
  "店務 staff@test.com / staff123",
  "美容師 groomer@test.com / groomer123",
  "照護師 caregiver@test.com / care123",
  "管理員 admin@test.com / admin123",
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const loggedInUser = await login(email, password);

      if (loggedInUser) {
        toast.success("登入成功");
        navigate(
          ["staff", "admin"].includes(loggedInUser.role || "")
            ? "/admin"
            : ["groomer", "caregiver"].includes(loggedInUser.role || "")
              ? "/workbench"
              : "/dashboard",
        );
      } else {
        toast.error("帳號或密碼錯誤");
      }

      return;
    }

    if (!name || !phone) {
      toast.error("請填寫所有欄位");
      return;
    }

    const registeredUser = await register(email, password, name, phone);

    if (registeredUser) {
      toast.success("註冊成功");
      navigate("/dashboard");
    } else {
      toast.error("此電子郵件已被註冊");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#fffaf6] via-[#fffefe] to-[#f7efe8] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#f0e6df] bg-white shadow-2xl lg:grid-cols-[0.9fr_1fr]">
          <section className="relative hidden bg-[#fbf4ee] p-10 lg:flex lg:flex-col lg:justify-center">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm text-[#6b3a2a] shadow-sm">
                <Sparkles className="h-4 w-4" />
                毛孩樂園
              </div>
              <h1 className="mb-4 text-4xl leading-tight text-[#3d1a0d]">
                放心交給我們，
                <br />
                用心照顧每一天
              </h1>
              <p className="max-w-sm text-base leading-relaxed text-[#8b5040]">
                預約、通知與照護紀錄，安心查看。
              </p>
            </div>

            <div className="relative mt-10">
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-[2rem] bg-[#eadfd8]" />
              <div className="relative overflow-hidden rounded-[1.75rem] bg-white p-3 shadow-lg">
                <img
                  src="/images/login.jpg"
                  alt="毛孩照護"
                  className="h-64 w-full rounded-[1.35rem] object-cover opacity-85 saturate-[0.88]"
                />
                <div className="absolute inset-3 rounded-[1.35rem] bg-gradient-to-t from-[#3d1a0d]/35 via-transparent to-white/20" />
                <div className="absolute bottom-6 left-6 rounded-full bg-white/90 px-4 py-2 text-sm text-[#6b3a2a] shadow-sm backdrop-blur-sm">
                  今日照護，一目了然
                </div>
              </div>
            </div>
          </section>

          <section className="p-7 sm:p-9 lg:p-10">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6b3a2a] text-white shadow-md">
                <PawPrint className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-3xl text-[#3d1a0d]">
                {isLogin ? "歡迎回來" : "建立帳號"}
              </h2>
              <p className="text-sm text-gray-500">
                {isLogin ? "登入後進入專屬頁面" : "開始管理毛孩資料"}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-full bg-[#faf7f4] p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`rounded-full py-2 text-sm transition-all ${
                  isLogin
                    ? "bg-white text-[#6b3a2a] shadow-sm"
                    : "text-gray-500 hover:text-[#6b3a2a]"
                }`}
              >
                登入
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`rounded-full py-2 text-sm transition-all ${
                  !isLogin
                    ? "bg-white text-[#6b3a2a] shadow-sm"
                    : "text-gray-500 hover:text-[#6b3a2a]"
                }`}
              >
                註冊
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className={isLogin ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}
            >
              {!isLogin && (
                <>
                  <Field
                    label="姓名"
                    icon={<User />}
                    value={name}
                    onChange={setName}
                    placeholder="請輸入姓名"
                  />
                  <Field
                    label="手機號碼"
                    icon={<Phone />}
                    value={phone}
                    onChange={setPhone}
                    placeholder="0912-345-678"
                    type="tel"
                  />
                </>
              )}

              <Field
                label="電子郵件"
                icon={<Mail />}
                value={email}
                onChange={setEmail}
                placeholder="example@email.com"
                type="email"
                className={isLogin ? "" : "sm:col-span-2"}
              />
              <Field
                label="密碼"
                icon={<Lock />}
                value={password}
                onChange={setPassword}
                placeholder="請輸入密碼"
                type="password"
                className={isLogin ? "" : "sm:col-span-2"}
              />

              <button
                type="submit"
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6b3a2a] py-3 text-white shadow-lg transition-all hover:bg-[#8b5040] hover:shadow-xl ${
                  isLogin ? "" : "sm:col-span-2"
                }`}
              >
                {isLogin ? "登入" : "註冊"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="mt-6 w-full text-center text-sm text-[#6b3a2a] hover:text-[#8b5040]"
            >
              {isLogin ? "還沒有帳號？立即註冊" : "已有帳號？返回登入"}
            </button>

            {isLogin && (
              <details className="mt-5 rounded-2xl border border-[#d9eaf5] bg-[#f7fbff] px-4 py-3 text-sm text-gray-600">
                <summary className="cursor-pointer text-center text-[#3f789f]">
                  查看測試帳號
                </summary>
                <div className="mt-3 space-y-1 text-center text-xs leading-relaxed">
                  {testAccounts.map((account) => (
                    <p key={account}>{account}</p>
                  ))}
                </div>
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  icon: React.ReactElement;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  className?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className={className}>
      <label className="mb-2 block text-sm text-[#3d1a0d]">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b87868]">
          {icon}
        </span>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-2xl border border-[#eadfd8] bg-white py-3 pl-12 ${
            isPassword ? "pr-12" : "pr-4"
          } text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c8a97e]`}
          placeholder={placeholder}
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#6b3a2a]"
            aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
          >
            {showPassword ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
