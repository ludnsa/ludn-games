"use client";
import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/home/SitePage";
import { BTN_GOLD, CARD, FIELD, LABEL } from "@/components/home/ui";

const supabase = getSupabaseBrowser();

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      setMessage("الرجاء كتابة كلمة مرور جديدة لا تقل عن 6 خانات");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("كلمة المرور وتأكيد كلمة المرور غير متطابقتين");
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
        setMessage("تم تحديث كلمة المرور بنجاح! جاري تحويلك للموقع...");

        // التحقق من الصلاحية لمعرفة إلى أين نوجهه
        const { data: { user } } = await supabase.auth.getUser();
        let redirectUrl = "/";

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role === 'Admin') {
            redirectUrl = "/admin";
          }
        }

        setTimeout(() => {
          router.push(redirectUrl);
        }, 2000);
      }
    } catch (err) {
      setMessage("حدث خطأ غير متوقع أثناء التحديث.");
    }
    setLoading(false);
  };

  return (
    <AuthShell>
      <div className={`${CARD} ludn-shadow p-6 sm:p-8 grid gap-6`}>
        <div className="grid gap-1.5 justify-items-center text-center">
          <span className="w-14 h-14 mb-1 rounded-2xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
            <KeyRound size={28} />
          </span>
          <h1 className="font-display text-[32px] leading-tight">
            تعيين كلمة مرور جديدة
          </h1>
          <p className="text-sm font-bold text-ludn-muted">
            المركز الأمني لمنصة الألعاب
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="new-password" className={LABEL}>
              كلمة المرور الجديدة:
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className={`${FIELD} text-left font-sans`}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={LABEL}>
              تأكيد كلمة المرور:
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className={`${FIELD} text-left font-sans`}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleUpdatePassword}
            className={`${BTN_GOLD} w-full mt-1`}
            disabled={loading}
          >
            {loading ? "جاري التحديث..." : "حفظ والدخول للموقع"}
          </button>

          {message && (
            <div
              className={`p-4 rounded-2xl text-center text-sm font-bold border ${message.includes("خطأ") ? "bg-rose-500/10 text-rose-500 border-rose-500/30" : "bg-ludn-green/10 text-ludn-green border-ludn-green/30"}`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
