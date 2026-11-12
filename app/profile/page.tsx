"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { NoticeDialog } from "@/components/home/NoticeDialog";
import { BTN_GOLD, CARD, FIELD, LABEL, SPINNER } from "@/components/home/ui";
import { useAuth } from "@/components/providers/AuthProvider";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const { refreshProfile } = useAuth();
  const [userSession, setUserSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: "", type: "success" });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          setLoading(false);
          return;
        }

        setUserSession(user);

        const { data } = await supabase
          .from("profiles")
          .select("full_name, phone_number, email")
          .eq("id", user.id)
          .maybeSingle();

        const userProfile = data || {
          full_name: user.user_metadata?.full_name || "لاعب جديد",
          phone_number: user.user_metadata?.phone_number || "",
        };

        setProfile({ ...userProfile, email: user.email });
        setEditFullName(userProfile.full_name || "");
        setEditPhone(userProfile.phone_number || "");

      } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleSaveChanges = async () => {
    if (!editFullName) {
      setNotification({ isOpen: true, message: "الاسم مطلوب ولا يمكن تركه فارغاً.", type: "error" });
      return;
    }
    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          phone_number: editPhone.trim(),
        })
        .eq("id", userSession.id);

      if (error) throw error;
      // الهيدر ياخذ الاسم الجديد على طول (طلب واحد للاسم)
      void refreshProfile();
      setNotification({ isOpen: true, message: "تم تحديث بيانات حسابك بنجاح.", type: "success" });
    } catch (error: any) {
      setNotification({ isOpen: true, message: "حدث خطأ أثناء حفظ التغييرات.", type: "error" });
    } finally {
      setSaveLoading(false);
    }
  };

  // بعد الخروج من قائمة الحساب يرجع للرئيسية زي ما كان
  const goHome = () => router.push("/");

  if (loading) {
    return (
      <SitePage width="max-w-2xl" afterLogout={goHome}>
        <div className="flex items-center justify-center py-24">
          <div className={`${SPINNER} w-10 h-10`}></div>
        </div>
      </SitePage>
    );
  }

  if (!userSession) {
    return (
      <SitePage width="max-w-md" afterLogout={goHome}>
        <div className={`${CARD} p-6 md:p-8 grid gap-2 justify-items-center text-center`}>
          <h2 className="font-display text-[30px] leading-tight">الجلسة غير متوفرة</h2>
          <p className="text-ludn-muted mb-4 font-bold">يرجى تسجيل الدخول للوصول إلى حسابك.</p>
          <Link href="/" className={`${BTN_GOLD} w-full`}>
            العودة للرئيسية
          </Link>
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage width="max-w-2xl" afterLogout={goHome}>
      <PageHeading back={{ href: "/", label: "رجوع" }} title="إعدادات حسابي" />

      <div className={`${CARD} p-5 md:p-7 grid gap-5`}>
        {/* صاحب الحساب */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-ludn-line">
          <span className="w-14 h-14 shrink-0 rounded-2xl bg-ludn-gold text-ludn-gold-ink font-black text-lg grid place-items-center uppercase">
            {profile?.full_name?.split(" ")[0]?.[0]}
            {profile?.full_name?.split(" ")[1]?.[0] || ""}
          </span>
          <div className="min-w-0">
            <p className="font-black text-lg truncate">{profile?.full_name}</p>
            <p className="text-sm font-bold text-ludn-muted truncate" dir="ltr">{profile?.email}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label htmlFor="profile-name" className={LABEL}>الاسم الثنائي</label>
            <input id="profile-name" type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} maxLength={24} autoComplete="name" className={FIELD} />
          </div>
          <div>
            <label htmlFor="profile-email" className={LABEL}>البريد الإلكتروني (أساسي لا يتغير)</label>
            <input id="profile-email" type="email" value={profile?.email || ""} disabled className={FIELD} />
          </div>
          <div>
            <label htmlFor="profile-phone" className={LABEL}>رقم الجوال</label>
            <input id="profile-phone" type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} autoComplete="tel" className={`${FIELD} text-left`} dir="ltr" />
          </div>
        </div>

        <button onClick={handleSaveChanges} disabled={saveLoading} className={`${BTN_GOLD} w-full text-lg`}>
          <Save size={20} /> {saveLoading ? "جاري الحفظ..." : "حفظ التغييرات الجديدة"}
        </button>
      </div>

      {notification.isOpen && (
        <NoticeDialog
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ ...notification, isOpen: false })}
        />
      )}
    </SitePage>
  );
}
