"use client";
import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Cairo } from "next/font/google";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Lock, Mail, ShieldCheck, KeyRound } from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = getSupabaseBrowser();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setMessage("الرجاء كتابة البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`خطأ: ${error.message}`);
      } else if (data.session) {
        setMessage("تم تسجيل الدخول بنجاح! جاري تحويلك...");
        router.refresh();
        router.push("/admin");
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    }
    setLoading(false);
  };

  const handleOtpLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setMessage("الرجاء كتابة البريد الإلكتروني أولاً");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });
      if (error) {
        setMessage(`خطأ: ${error.message}`);
      } else {
        setMessage(
          "تم إرسال رابط الدخول السحري إلى إيميلك! افتح بريدك واضغط على كلمة (Sign in) وبيدخلك للوحة التحكم مباشرة.",
        );
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء إرسال الرابط.");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMessage(
        "الرجاء كتابة البريد الإلكتروني أولاً عشان نرسل لك رابط الاستعادة",
      );
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setMessage(`خطأ: ${error.message}`);
      } else {
        setMessage(
          "تم إرسال رابط استعادة كلمة المرور لإيميلك! شيك على الوارد.",
        );
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع.");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google login error:", error);
      setMessage("حدث خطأ أثناء الاتصال بحساب Google.");
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 ${cairo.className} transition-colors duration-500`}
      dir="rtl"
    >
      {mounted && (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-6 left-6 p-3 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:scale-105 transition-all z-20"
        >
          {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      )}

      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="text-white" size={32} />
          </div>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            لوحة تفعيل الأمان
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            نظام الدخول المركزي لإدارة المنصة
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setMessage("");
            }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "password" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Lock size={16} />
            كلمة المرور
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("otp");
              setMessage("");
            }}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "otp" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
          >
            <Mail size={16} />
            الرابط السحري
          </button>
        </div>

        <form onSubmit={activeTab === "password" ? handlePasswordLogin : handleOtpLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-black text-slate-700 dark:text-slate-300">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full pl-4 pr-12 py-4 border-2 border-transparent bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-900 dark:text-white text-left font-sans focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all focus:bg-white dark:focus:bg-slate-900 shadow-sm"
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {activeTab === "password" && (
            <div className="space-y-1.5">
              <label className="block text-sm font-black text-slate-700 dark:text-slate-300">
                كلمة المرور
              </label>
              <div className="relative">
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-4 border-2 border-transparent bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-900 dark:text-white text-left font-sans focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all focus:bg-white dark:focus:bg-slate-900 shadow-sm"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? (
               <span className="animate-pulse">جاري التنفيذ...</span>
            ) : (
              activeTab === "password" ? "تسجيل الدخول" : "إرسال رابط الدخول"
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
          <span className="text-xs font-bold text-slate-400">أو عبر</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          تسجيل الدخول عبر Google
        </button>

        {message && (
          <div
            className={`mt-6 p-4 rounded-2xl text-center text-sm font-bold border transition-all ${message.includes("خطأ") ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"}`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
