"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Cairo } from "next/font/google";
// استدعينا أداة التوجيه من Next.js
import { useRouter } from "next/navigation";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

export default function LoginPage() {
  const router = useRouter(); // تفعيل أداة التوجيه
  const [activeTab, setActiveTab] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // دخلنا تهيئة سوبابيس داخل المكون عشان تتحدث مع كل طلب وما تقرأ من الكاش القديم
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handlePasswordLogin = async () => {
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
        // الحركة السحرية: نحدث بيانات السيرفر إجبارياً بعدين نحولك للآدمن
        router.refresh();
        router.push("/admin");
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    }
    setLoading(false);
  };

  const handleOtpLogin = async () => {
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

  return (
    <div
      className={`min-h-screen w-full fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-4 ${cairo.className}`}
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
            لوحة تفعيل الأمان
          </h1>
          <p className="text-sm font-bold text-slate-500">
            نظام تسجيل الدخول المركز لمنصة الألعاب
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <button
            onClick={() => {
              setActiveTab("password");
              setMessage("");
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${activeTab === "password" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
          >
            كلمة المرور
          </button>
          <button
            onClick={() => {
              setActiveTab("otp");
              setMessage("");
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-lg transition-all ${activeTab === "otp" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
          >
            الرابط السحري (OTP)
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">
              البريد الإلكتروني:
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans focus:outline-none focus:border-indigo-500"
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {activeTab === "password" ? (
            <>
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-400 mb-2">
                  كلمة المرور:
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-left font-sans focus:outline-none focus:border-indigo-500"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              </div>

              <button
                onClick={handlePasswordLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "جاري التحقق..." : "تسجيل الدخول بالكلمة"}
              </button>
            </>
          ) : (
            <button
              onClick={handleOtpLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "جاري إرسال الرابط..." : "إرسال رابط الدخول السحري"}
            </button>
          )}

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
