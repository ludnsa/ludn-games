"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { checkPhoneUnique } from "@/app/actions/auth";
import { 
  Home, 
  MessageCircle, 
  Sun, 
  Moon, 
  Swords, 
  Globe, 
  Gavel, 
  ChevronDown,
  User,
  Search
} from "lucide-react";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

const supabase = getSupabaseBrowser();

// ----------------------------------------------------
// قائمة الدول العربية ومفاتيحها والأعلام
// ----------------------------------------------------
const arabCountries = [
  { name: "السعودية", code: "+966", flag: "🇸🇦" },
  { name: "الإمارات", code: "+971", flag: "🇦🇪" },
  { name: "الكويت", code: "+965", flag: "🇰🇼" },
  { name: "قطر", code: "+974", flag: "🇶🇦" },
  { name: "البحرين", code: "+973", flag: "🇧🇭" },
  { name: "عمان", code: "+968", flag: "🇴🇲" },
  { name: "مصر", code: "+20", flag: "🇪🇬" },
  { name: "الأردن", code: "+962", flag: "🇯🇴" },
  { name: "فلسطين", code: "+970", flag: "🇵🇸" },
  { name: "لبنان", code: "+961", flag: "🇱🇧" },
  { name: "سوريا", code: "+963", flag: "🇸🇾" },
  { name: "العراق", code: "+964", flag: "🇮🇶" },
  { name: "اليمن", code: "+967", flag: "🇾🇪" },
  { name: "السودان", code: "+249", flag: "🇸🇩" },
  { name: "المغرب", code: "+212", flag: "🇲🇦" },
  { name: "الجزائر", code: "+213", flag: "🇩🇿" },
  { name: "تونس", code: "+216", flag: "🇹🇳" },
  { name: "ليبيا", code: "+218", flag: "🇱🇾" },
];

// ----------------------------------------------------
// محرك خلفية الألعاب
// ----------------------------------------------------
const SolidGamingBackground = () => {
  const [isDark, setIsDark] = useState(true);
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const gameShapes = [
      <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>,
      <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><circle cx="15.5" cy="15.5" r="1.5"></circle><circle cx="15.5" cy="8.5" r="1.5"></circle><circle cx="8.5" cy="15.5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle></svg>,
      <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4" /><path d="M6 20V4h6v4" /><circle cx="12" cy="11" r="2" /><line x1="12" y1="13" x2="12" y2="17" /><line x1="10" y1="15" x2="14" y2="15" /><line x1="12" y1="17" x2="10" y2="20" /><line x1="12" y1="17" x2="14" y2="20" /></svg>,
    ];

    const iconColors = ["text-emerald-500", "text-rose-500", "text-purple-500", "text-amber-500", "text-blue-500"];

    const generatedIcons = Array.from({ length: 12 }).map((_, i) => ({
      id: `icon-${i}`,
      shape: gameShapes[i % gameShapes.length],
      colorClass: iconColors[i % iconColors.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 40 + 40,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 15 + 20}s`,
      rotate: Math.random() * 360,
    }));
    setIcons(generatedIcons);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
        {icons.map((icon) => (
          <div key={icon.id} className={`absolute animate-float-game-extra ${icon.colorClass}`} style={{ left: icon.left, top: icon.top, width: `${icon.size}px`, height: `${icon.size}px`, animationDelay: icon.delay, animationDuration: icon.duration, transform: `rotate(${icon.rotate}deg)` }}>
            {icon.shape}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function PlayerLoginPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  
  // حالات الإدخال المشتركة
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  
  // حالات الإدخال الخاصة بإنشاء الحساب
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // حالات خاصة بالقائمة المنسدلة العصرية
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: "", type: "success" });

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme_preference", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme_preference", "dark");
      setIsDark(true);
    }
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
        setNotification({ isOpen: true, message: "تأكد من صحة البيانات أو إن الحساب غير موجود مسبقاً.", type: "error" });
      } finally {
        setAuthLoading(false);
      }
    } else {
      if (!fullName || !authEmail || !phone || !authPassword) {
        setNotification({ isOpen: true, message: "الرجاء تعبئة جميع الحقول المطلوبة.", type: "error" });
        return;
      }
      if (!termsAccepted) {
        setNotification({ isOpen: true, message: "يجب الموافقة على الشروط والأحكام لإتمام التسجيل.", type: "error" });
        return;
      }

      setAuthLoading(true);
      try {
        const fullPhoneNumber = `${countryCode}${phone}`;
        
        // التحقق من أن رقم الجوال غير مستخدم مسبقاً
        const { isUnique } = await checkPhoneUnique(fullPhoneNumber);
        if (!isUnique) {
          setNotification({ isOpen: true, message: "هذا البريد الإلكتروني أو رقم الجوال مستخدم.", type: "error" });
          setAuthLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              phone_number: fullPhoneNumber,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        
        // التقاط خطأ الإيميل المستخدم
        if (error) {
          if (error.status === 422 || (error.message && error.message.includes("already registered"))) {
            throw new Error("هذا البريد الإلكتروني أو رقم الجوال مستخدم.");
          }
          throw error;
        }

        // بعد التسجيل، نتأكد أن الجلسة مفعلة قبل الانتقال
        // Supabase قد يعيد جلسة مباشرة إذا كان Confirm Email معطلاً
        if (data.session) {
          setNotification({ isOpen: true, message: "تم إنشاء الحساب بنجاح! جاري توجيهك...", type: "success" });
          // الانتظار قليلاً ثم تحديث الصفحة بالكامل لضمان أن الـ Middleware يقرأ الجلسة الجديدة
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          // في حال كان تأكيد الإيميل مفعلاً
          setNotification({ isOpen: true, message: "تم إنشاء الحساب! الرجاء تفعيل حسابك من البريد الإلكتروني.", type: "success" });
        }
      } catch (error: any) {
        console.error("Email auth error:", error);
        setNotification({ isOpen: true, message: error.message || "حدث خطأ أثناء التسجيل.", type: "error" });
      } finally {
        setAuthLoading(false);
      }
    }
  };

  return (
    <main className={`min-h-screen flex flex-col relative overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 ${tajawal.className}`} dir="rtl">
      


      {/* محرك الخلفية */}
      <SolidGamingBackground />

      {/* الهيدر المبسط */}
      <header className="w-full max-w-7xl mx-auto px-4 pt-6 relative z-50">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-4 border-slate-900 dark:border-black p-3 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex justify-between items-center transition-colors duration-300">
          <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-2">
            <img src="/logo.svg" alt="الشعار" className="h-12 md:h-16 w-auto max-w-[140px] md:max-w-[200px] object-contain" />
          </Link>

          <nav className="hidden sm:flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Home size={18} className="text-slate-500 dark:text-slate-400" /> <span>الرئيسية</span>
            </Link>
            <Link href="/#contact-section" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <MessageCircle size={18} className="text-blue-500" /> <span>تواصل معنا</span>
            </Link>
          </nav>

          <div className="flex gap-2 pr-2 items-center">
            <button onClick={toggleTheme} className="w-11 h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0">
              {isDark ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} className="animate-wiggle" />}
            </button>
          </div>
        </div>
      </header>

      {/* محتوى تسجيل الدخول */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10 w-full my-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border-4 border-blue-500 rounded-[2rem] p-6 md:p-8 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-3xl mx-auto flex items-center justify-center mb-6 border-b-4 border-blue-200 dark:border-blue-800">
            <User size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 dark:text-white mb-2">
            بوابة القيادة
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm md:text-base">
            {isLoginMode ? "سجل دخولك لبدء إدارة ألعابك وتحدياتك" : "أنشئ حسابك الجديد وانضم لعالم التحديات"}
          </p>

          <div className="flex flex-col gap-4">
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
              
              {!isLoginMode && (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الثنائي"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors"
                />
              )}

              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors"
              />

              {!isLoginMode && (
                <div className="flex gap-2" dir="ltr">
                  {/* القائمة المنسدلة العصرية */}
                  <div className="relative">
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-between gap-1 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-3.5 md:py-4 text-slate-900 dark:text-white font-bold cursor-pointer hover:border-blue-500 transition-colors w-28 md:w-32 h-full"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-lg">{arabCountries.find(c => c.code === countryCode)?.flag}</span>
                        <span dir="ltr" className="text-xs md:text-sm">{countryCode}</span>
                      </span>
                      <ChevronDown size={16} className={`transition-transform text-slate-500 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                          <div className="p-3 border-b-2 border-slate-100 dark:border-slate-700">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl px-3 py-2">
                              <Search size={16} className="text-slate-400" />
                              <input
                                type="text"
                                placeholder="ابحث عن الدولة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none outline-none px-2 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                                dir="rtl"
                              />
                            </div>
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {arabCountries.filter(c => c.name.includes(searchQuery) || c.code.includes(searchQuery)).map(country => (
                              <div
                                key={country.code}
                                onClick={() => {
                                  setCountryCode(country.code);
                                  setIsDropdownOpen(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{country.flag}</span>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{country.name}</span>
                                </div>
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400" dir="ltr">{country.code}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="5XXXXXXXX"
                    className="flex-1 w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors text-right"
                    dir="rtl"
                  />
                </div>
              )}

              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="كلمة المرور"
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 md:p-4 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-colors"
              />

              {isLoginMode && (
                <div className="flex justify-end mt-1 px-1">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={authLoading}
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    هل نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              {!isLoginMode && (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                    أوافق على <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300">الشروط والأحكام</Link>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-4 mt-2 bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 text-white font-black text-lg rounded-2xl transition-all active:translate-y-1 active:border-b-0 disabled:opacity-50"
              >
                {authLoading ? "جاري التحميل..." : (isLoginMode ? "تسجيل الدخول" : "إنشاء حساب جديد")}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthPassword("");
              }}
              className="text-slate-500 dark:text-slate-400 font-bold text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isLoginMode ? "ما عندك حساب؟ سجل معنا اللحين" : "عندك حساب؟ تفضل بتسجيل الدخول"}
            </button>

            <div className="flex items-center gap-3 my-2 opacity-60">
              <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full"></div>
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">أو</span>
              <div className="h-0.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="relative flex items-center justify-center gap-3 w-full py-3.5 md:py-4 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-white font-black text-base md:text-lg rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              المتابعة باستخدام قوقل
            </button>

            <button
              disabled
              className="relative flex items-center justify-center gap-3 w-full py-3.5 md:py-4 bg-slate-900 border-2 border-slate-900 text-white font-black text-base md:text-lg rounded-2xl opacity-80 cursor-not-allowed overflow-hidden mt-1"
            >
              <div className="absolute -left-7 top-4 bg-rose-600 text-white text-[11px] font-black px-10 py-1 -rotate-45 shadow-md border border-rose-400 tracking-wider">
                قريباً
              </div>
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.63 2.38-3.13 1.83-2.58 6.19.46 7.37-.62 1.48-1.57 2.84-2.74 3.26zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              المتابعة باستخدام Apple
            </button>
          </div>
        </div>
      </div>

      {/* الفوتر */}
      <footer className="w-full bg-white dark:bg-slate-800 border-t-8 border-slate-200 dark:border-slate-950 pt-12 pb-8 relative z-10 transition-colors duration-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src="/logo.svg" alt="الشعار" className="h-16 md:h-20 w-auto max-w-[160px] md:max-w-[240px] object-contain" />
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm text-center md:text-right mt-2 max-w-xs">
              منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-start gap-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">روابط سريعة</h3>
            <ul className="flex flex-col gap-3 font-bold text-slate-600 dark:text-slate-300">
              <li><Link href="/" className="hover:text-blue-500 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-blue-500" /> الرئيسية</Link></li>
              <li><Link href="/#contact-section" className="hover:text-blue-500 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-blue-500" /> تواصل معنا</Link></li>
            </ul>
          </div>
          <div className="flex flex-col items-center md:items-start gap-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">الألعاب والخدمات</h3>
            <ul className="flex flex-col gap-3 font-bold text-slate-600 dark:text-slate-300">
              <li><Link href="/games/castle-war" className="hover:text-rose-500 transition-colors flex items-center gap-2"><Swords size={18} className="text-rose-500" /> حرب القلاع</Link></li>
              <li><Link href="/games/world-domination" className="hover:text-blue-500 transition-colors flex items-center gap-2"><Globe size={18} className="text-blue-500" /> السيطرة على العالم</Link></li>
              <li><Link href="/games/auction" className="hover:text-amber-500 transition-colors flex items-center gap-2"><Gavel size={18} className="text-amber-500" /> حرب المزايدات</Link></li>
            </ul>
          </div>
        </div>
        <div className="w-full pt-6 border-t-4 border-slate-200 dark:border-slate-700 text-center px-4">
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">2026 لدن التقنية - جميع الحقوق محفوظة ©</p>
        </div>
      </footer>

      {/* النافذة المنبثقة */}
      {notification.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 max-w-md w-full shadow-2xl border-2 border-slate-100 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>
              {notification.type === 'success' ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">
              {notification.type === 'success' ? 'ممتاز!' : 'تنبيه'}
            </h3>
            <p className="text-center text-slate-600 dark:text-slate-300 font-bold mb-6">
              {notification.message}
            </p>
            <button
              onClick={() => setNotification({ ...notification, isOpen: false })}
              className={`w-full py-4 rounded-xl font-black text-white transition-all active:scale-95 ${notification.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </main>
  );
}