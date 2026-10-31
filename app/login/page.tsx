"use client";
import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { Moon, Sun, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/home/SitePage";
import { BTN_GOLD, BTN_SOFT, CARD, FIELD, LABEL } from "@/components/home/ui";

export default function LoginPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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
        if (data.session.user?.app_metadata?.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
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
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
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

  const isDark = resolvedTheme === "dark";

  return (
    <AuthShell
      corner={
        mounted && (
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="تبديل الوضع الليلي والنهاري"
            className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] left-4 w-10 h-10 rounded-xl bg-ludn-surface border border-ludn-line text-ludn-fg grid place-items-center transition-transform active:scale-95 z-20"
          >
            {isDark ? <Sun size={19} className="text-ludn-gold-text" /> : <Moon size={19} />}
          </button>
        )
      }
    >
      <div className={`${CARD} ludn-shadow p-6 sm:p-8 grid gap-6`}>
        <div className="grid gap-1.5 justify-items-center text-center">
          <span className="w-14 h-14 mb-1 rounded-2xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
            <ShieldCheck size={30} />
          </span>
          <h1 className="font-display text-[32px] leading-tight">
            لوحة تفعيل الأمان
          </h1>
          <p className="text-sm font-bold text-ludn-muted">
            نظام الدخول المركزي لإدارة المنصة
          </p>
        </div>

        <form onSubmit={handlePasswordLogin} className="grid gap-4">
          <div>
            <label htmlFor="admin-email" className={LABEL}>
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ludn-muted pointer-events-none" size={20} />
              <input
                id="admin-email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                className={`${FIELD} ps-11 text-left font-sans`}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className={LABEL}>
              كلمة المرور
            </label>
            <div className="relative">
              <KeyRound className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ludn-muted pointer-events-none" size={20} />
              <input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className={`${FIELD} ps-11 text-left font-sans`}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-sm font-bold text-ludn-gold-text hover:underline underline-offset-4"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </div>

          <button type="submit" className={`${BTN_GOLD} w-full`} disabled={loading}>
            {loading ? (
               <span className="animate-pulse">جاري التنفيذ...</span>
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ludn-line"></div>
          <span className="text-xs font-bold text-ludn-muted">أو عبر</span>
          <div className="flex-1 h-px bg-ludn-line"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`${BTN_SOFT} w-full`}
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
            className={`p-4 rounded-2xl text-center text-sm font-bold border ${message.includes("خطأ") ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-ludn-green/10 text-ludn-green border-ludn-green/30"}`}
          >
            {message}
          </div>
        )}
      </div>
    </AuthShell>
  );
}
