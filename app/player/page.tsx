"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SitePage } from "@/components/home/SitePage";
import { NoticeDialog } from "@/components/home/NoticeDialog";
import { BTN_GOLD, BTN_SOFT, CARD, FIELD } from "@/components/home/ui";

const supabase = getSupabaseBrowser();

export default function PlayerLoginPage() {
  // حالات الإدخال المشتركة
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // حالات الإدخال الخاصة بإنشاء الحساب
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: "", type: "success" });

  // التبديل بين الدخول وإنشاء حساب (يمسح كلمة المرور زي قبل)
  const switchMode = (loginMode: boolean) => {
    if (loginMode === isLoginMode) return;
    setIsLoginMode(loginMode);
    setAuthPassword("");
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // تم التعديل هنا لتوجيه اللاعب للصفحة الرئيسية مباشرة
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google login error:", error);
      setNotification({ isOpen: true, message: "حدث خطأ أثناء الاتصال بقوقل.", type: "error" });
    }
  };

  const handleResetPassword = async () => {
    if (!authEmail) {
      setNotification({ isOpen: true, message: "الرجاء كتابة البريد الإلكتروني أولاً حتى نتمكن من إرسال رابط الاستعادة", type: "error" });
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        setNotification({ isOpen: true, message: `خطأ: ${error.message}`, type: "error" });
      } else {
        setNotification({ isOpen: true, message: "تم إرسال رابط استعادة كلمة المرور لإيميلك! شيك على الوارد.", type: "success" });
      }
    } catch (err) {
      setNotification({ isOpen: true, message: "حدث خطأ غير متوقع.", type: "error" });
    }
    setAuthLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoginMode) {
      if (!authEmail || !authPassword) {
        setNotification({ isOpen: true, message: "الرجاء إدخال البريد الإلكتروني وكلمة المرور.", type: "error" });
        return;
      }
      setAuthLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        // نستخدم window.location.href بدلاً من router.push لضمان أن Middleware يقرأ الكوكيز الجديدة
        window.location.href = "/";
      } catch (error: any) {
        console.error("Email auth error:", error);
        if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
          // حسابات قديمة أُنشئت قبل تعطيل تأكيد البريد
          setNotification({ isOpen: true, message: "هذا الحساب غير موثق. تواصل مع الدعم لتفعيله.", type: "error" });
        } else {
          setNotification({ isOpen: true, message: "تأكد من صحة البيانات أو إن الحساب غير موجود مسبقاً.", type: "error" });
        }
      } finally {
        setAuthLoading(false);
      }
    } else {
      if (!fullName || !authEmail || !authPassword) {
        setNotification({ isOpen: true, message: "الرجاء تعبئة جميع الحقول المطلوبة.", type: "error" });
        return;
      }
      if (!termsAccepted) {
        setNotification({ isOpen: true, message: "يجب الموافقة على الشروط والأحكام لإتمام التسجيل.", type: "error" });
        return;
      }

      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        // التقاط خطأ الإيميل المستخدم
        if (error) {
          if (error.status === 422 || (error.message && error.message.includes("already registered"))) {
            throw new Error("هذا البريد الإلكتروني مستخدم مسبقاً.");
          }
          throw error;
        }

        if (!data.session) {
          // يحدث فقط إذا كان تأكيد البريد لا يزال مفعلاً في لوحة تحكم Supabase
          throw new Error("تعذّر إنشاء الجلسة. حاول تسجيل الدخول يدوياً.");
        }

        // نستخدم window.location.href بدلاً من router.push لضمان أن Middleware يقرأ الكوكيز الجديدة
        window.location.href = "/";

      } catch (error: any) {
        console.error("Email auth error:", error);
        setNotification({ isOpen: true, message: error.message || "حدث خطأ أثناء التسجيل.", type: "error" });
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const tabClass = (active: boolean) =>
    `h-11 rounded-xl font-black text-sm transition-colors ${active ? "bg-ludn-surface text-ludn-fg shadow-sm" : "text-ludn-muted hover:text-ludn-fg"}`;

  return (
    <SitePage width="max-w-md">
      <div className={`${CARD} ludn-shadow p-5 md:p-7 grid gap-5 animate-in fade-in zoom-in-95 duration-300`}>

        <div className="grid gap-1.5 text-center">
          <h1 className="font-display text-[34px] leading-tight">التسجيل والدخول</h1>
          <p className="text-ludn-muted font-semibold text-sm md:text-base">
            {isLoginMode ? "سجل دخولك لبدء إدارة ألعابك وتحدياتك" : "أنشئ حسابك الجديد وانضم لعالم التحديات"}
          </p>
        </div>

        {/* دخول / حساب جديد */}
        <div role="tablist" aria-label="نوع الدخول" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-ludn-surface-2">
          <button type="button" role="tab" aria-selected={isLoginMode} onClick={() => switchMode(true)} className={tabClass(isLoginMode)}>
            تسجيل الدخول
          </button>
          <button type="button" role="tab" aria-selected={!isLoginMode} onClick={() => switchMode(false)} className={tabClass(!isLoginMode)}>
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleEmailAuth} className="grid gap-3">
          {!isLoginMode && (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الثنائي"
              autoComplete="name"
              className={FIELD}
            />
          )}

          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            autoComplete="email"
            className={FIELD}
          />

          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="كلمة المرور"
            autoComplete={isLoginMode ? "current-password" : "new-password"}
            className={FIELD}
          />

          {isLoginMode && (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={authLoading}
              className="justify-self-end px-1 text-sm font-bold text-ludn-gold-text hover:underline underline-offset-4"
            >
              هل نسيت كلمة المرور؟
            </button>
          )}

          {!isLoginMode && (
            <div className="flex items-center gap-2.5 px-1">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 accent-ludn-gold rounded cursor-pointer shrink-0"
              />
              <label htmlFor="terms" className="text-sm font-bold text-ludn-muted cursor-pointer">
                أوافق على <Link href="/terms" target="_blank" className="text-ludn-gold-text underline underline-offset-4">الشروط والأحكام</Link>
              </label>
            </div>
          )}

          <button type="submit" disabled={authLoading} className={`${BTN_GOLD} w-full mt-1 text-lg`}>
            {authLoading ? "جاري التحميل..." : (isLoginMode ? "تسجيل الدخول" : "إنشاء حساب جديد")}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-ludn-line"></div>
          <span className="text-ludn-muted font-bold text-sm">أو</span>
          <div className="h-px flex-1 bg-ludn-line"></div>
        </div>

        <div className="grid gap-2.5">
          <button type="button" onClick={handleGoogleLogin} className={`${BTN_SOFT} w-full`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            المتابعة باستخدام قوقل
          </button>

          <button type="button" disabled className={`${BTN_SOFT} w-full`}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.63 2.38-3.13 1.83-2.58 6.19.46 7.37-.62 1.48-1.57 2.84-2.74 3.26zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            المتابعة باستخدام Apple
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white">قريباً</span>
          </button>
        </div>
      </div>

      {/* النافذة المنبثقة */}
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
