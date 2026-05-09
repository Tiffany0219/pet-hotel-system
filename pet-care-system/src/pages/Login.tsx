import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Phone, PawPrint, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const success = await login(email, password);
      if (success) { toast.success('登入成功！'); navigate('/dashboard'); } else toast.error('帳號或密碼錯誤');
      return;
    }
    if (!name || !phone) { toast.error('請填寫所有欄位'); return; }
    const success = await register(email, password, name, phone);
    if (success) { toast.success('註冊成功！'); navigate('/dashboard'); } else toast.error('此電子郵件已被註冊');
  };

  return <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden bg-gradient-to-br from-[#fdf6f0] via-[#fff8f2] to-[#f5ede8] py-16 px-4"><div className="absolute left-8 top-10 text-8xl opacity-10">🐾</div><div className="absolute right-10 bottom-8 text-8xl opacity-10">🐶</div><div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-10 items-center"><div className="hidden lg:block"><div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 text-[#6b3a2a] text-sm shadow-sm mb-6"><Sparkles className="w-4 h-4" />歡迎來到毛孩樂園</div><h1 className="text-6xl leading-tight mb-6 text-[#3d1a0d]">登入會員，<br />管理毛孩的<br />專屬照護</h1><p className="text-xl text-[#6b3a2a] leading-relaxed max-w-lg">登入後可以新增寵物資料、預約住宿與美容服務，並查看所有預約紀錄與服務狀態。</p></div><div className="max-w-md w-full mx-auto"><div className="bg-white/95 rounded-3xl shadow-2xl p-8 border border-[#f0e6df]"><div className="text-center mb-8"><div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#6b3a2a] flex items-center justify-center shadow-md"><PawPrint className="w-8 h-8 text-white" /></div><h2 className="text-3xl mb-3 text-[#3d1a0d]">{isLogin ? '會員登入' : '會員註冊'}</h2><p className="text-sm text-gray-500">{isLogin ? '登入後即可預約服務與管理毛孩資料' : '建立帳號，開始使用毛孩照護服務'}</p></div><div className="grid grid-cols-2 bg-[#faf7f4] rounded-full p-1 mb-6"><button type="button" onClick={()=>setIsLogin(true)} className={`py-2 rounded-full text-sm transition-all ${isLogin?'bg-white text-[#6b3a2a] shadow-sm':'text-gray-500 hover:text-[#6b3a2a]'}`}>登入</button><button type="button" onClick={()=>setIsLogin(false)} className={`py-2 rounded-full text-sm transition-all ${!isLogin?'bg-white text-[#6b3a2a] shadow-sm':'text-gray-500 hover:text-[#6b3a2a]'}`}>註冊</button></div><form onSubmit={handleSubmit} className="space-y-4">{!isLogin&&<><Field label="姓名" icon={<User/>} value={name} onChange={setName} placeholder="請輸入姓名" /><Field label="手機號碼" icon={<Phone/>} value={phone} onChange={setPhone} placeholder="0912-345-678" type="tel" /></>}<Field label="電子郵件" icon={<Mail/>} value={email} onChange={setEmail} placeholder="example@email.com" type="email" /><Field label="密碼" icon={<Lock/>} value={password} onChange={setPassword} placeholder="請輸入密碼" type="password" /><button type="submit" className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#6b3a2a] text-white rounded-full hover:bg-[#8b5040] transition-all shadow-lg hover:shadow-xl mt-2">{isLogin?'登入':'註冊'} <ArrowRight className="w-4 h-4" /></button></form><div className="mt-6 text-center"><button onClick={()=>setIsLogin(!isLogin)} className="text-[#6b3a2a] hover:text-[#8b5040] text-sm">{isLogin?'還沒有帳號？立即註冊':'已有帳號？返回登入'}</button></div>{isLogin&&<div className="mt-5 p-4 bg-[#f7fbff] border border-[#d9eaf5] rounded-2xl"><p className="text-xs text-gray-600 text-center leading-relaxed">測試帳號：demo@test.com<br />測試密碼：demo123</p></div>}</div></div></div></div>;
}
function Field({label,icon,value,onChange,placeholder,type='text'}:{label:string;icon:React.ReactElement;value:string;onChange:(v:string)=>void;placeholder:string;type?:string}){return <div><label className="block text-sm mb-2 text-[#3d1a0d]">{label}</label><div className="relative">{<span className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b87868]">{icon}</span>}<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-[#eadfd8] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#c8a97e] bg-white text-gray-700" placeholder={placeholder} required /></div></div>}
