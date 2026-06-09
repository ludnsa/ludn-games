"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      setMessage("الرجاء كتابة كلمة مرور جديدة لا تقل عن 6 خانات");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setMessage(`خطأ: ${error.message}`);
      } else {
        setMessage("تم تحديث كلمة المرور بنجاح! جاري تحويلك للوحة التحكم...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 2000);
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء التحديث.");
    }
    setLoading(false);
  };

  return (
    <div
      className={`min-h-screen w-full fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-4 ${cairo.className}`}
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-sm font-bold text-slate-500">
            المركز الأمني لمنصة الألعاب
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">
              كلمة المرور الجديدة:
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans focus:outline-none focus:border-indigo-500"
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleUpdatePassword}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "جاري التحديث..." : "حفظ والدخول للوحة التحكم"}
          </button>

          {message && (
            <div
              className={`p-3 rounded-xl text-center text-xs font-bold border mt-2 ${message.includes("خطأ") ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
