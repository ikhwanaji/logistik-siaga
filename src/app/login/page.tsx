'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  resetPassword, 
  getAuthErrorMessage 
} from '@/lib/authService';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  
  // State UI
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);

  // State Form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Handler Input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ─── ACTION HANDLERS ──────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginWithEmail(formData.email, formData.password);
      toast.success("Login Berhasil", { description: "Selamat datang kembali!" });
      router.push('/home');
    } catch (error: any) {
      toast.error("Gagal Masuk", { description: getAuthErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.warning("Password Lemah", { description: "Password minimal 6 karakter." });
      return;
    }
    
    setIsLoading(true);
    try {
      await registerWithEmail(formData.email, formData.password, formData.name);
      toast.success("Akun Dibuat!", { description: "Silakan Masuk ke Akun Anda." });
      router.push('/login');
    } catch (error: any) {
      toast.error("Gagal Daftar", { description: getAuthErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validasi Input Kosong
    if (!formData.email) {
      toast.warning("Email Kosong", { description: "Masukkan alamat email Anda terlebih dahulu." });
      return;
    }

    // 2. Validasi Format Email (Regex Sederhana)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Format Email Salah", { description: "Mohon masukkan email yang valid." });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(formData.email);
      
      // 3. UX Success: Beritahu user langkah selanjutnya
      toast.success("Link Terkirim! 📧", { 
        description: "Cek Inbox atau folder Spam email Anda untuk mereset password.",
        duration: 5000, // Tampil agak lama biar terbaca
      });
      
      // 4. Kembalikan ke view login agar user siap-siap login
      setView('login'); 
      
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      
      // Handle error spesifik Firebase
      if (error.code === 'auth/user-not-found') {
        toast.error("Jika email terdaftar, link akan dikirim", { description: "Cek folder spam" });
      } else {
        toast.error("Gagal Kirim Email", { description: getAuthErrorMessage(error) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Login Google Berhasil", { description: "Mengalihkan..." });
      router.push('/home');
    } catch (error: any) {
      console.error("Google Login Error:", error); // Penting untuk debugging
      toast.error("Gagal Login Google", { description: getAuthErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── UI COMPONENTS ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 py-10">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-slate-100 relative overflow-hidden">
        
        {/* Decorative Background Blob */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-2xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-60 pointer-events-none" />

        {/* LOGO AREA */}
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200 transform rotate-3">
            <span className="text-3xl">🚨</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">LogistikSiaga</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Tanggap Bencana, Cepat & Tepat</p>
        </div>

        {/* ─── VIEW: LOGIN ───────────────────────────────────────────────── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="text-right mt-1">
                <button type="button" onClick={() => setView('forgot')} className="text-[10px] text-red-500 font-bold hover:underline">
                  Lupa Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Masuk <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {/* ─── VIEW: REGISTER ────────────────────────────────────────────── */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nama Lengkap</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Budi Santoso"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Min. 6 karakter"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Daftar Akun Baru"}
            </button>
          </form>
        )}

        {/* ─── VIEW: FORGOT PASSWORD ─────────────────────────────────────── */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotPass} className="space-y-4 relative z-10 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="text-center mb-2">
              <h3 className="font-bold text-slate-800">Reset Password</h3>
              <p className="text-xs text-slate-500">Masukkan email yang terdaftar untuk menerima link reset.</p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Kirim Link Reset"}
            </button>

            <button 
              type="button" 
              onClick={() => setView('login')}
              className="w-full text-xs font-bold text-slate-500 py-2 flex items-center justify-center gap-1 hover:text-slate-800"
            >
              <ArrowLeft size={14} /> Kembali ke Login
            </button>
          </form>
        )}

        {/* ─── DIVIDER & GOOGLE (Hanya di Login & Register) ──────────────── */}
        {view !== 'forgot' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-400 font-medium">Atau lanjutkan dengan</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-70"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Account
            </button>

            {/* SWITCH LOGIN/REGISTER TEXT */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                {view === 'login' ? "Belum punya akun? " : "Sudah punya akun? "}
                <button 
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="font-bold text-red-600 hover:underline"
                >
                  {view === 'login' ? "Daftar sekarang" : "Login disini"}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}