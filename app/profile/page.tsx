"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { 
  Settings, Save, ArrowRight, Home, Info, Gamepad2, 
  MessageCircle, ChevronDown, User, Sun, Moon, LogOut, 
  Swords, Globe, Gavel 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export default function ProfilePage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [userSession, setUserSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, message: "", type: "success" });

  // حالات الهيدر
  const [isDark, setIsDark] = useState(true);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

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
      setNotification({ isOpen: true, message: "تم تحديث بيانات حسابك بنجاح.", type: "success" });
    } catch (error: any) {
      setNotification({ isOpen: true, message: "حدث خطأ أثناء حفظ التغييرات.", type: "error" });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    setProfile(null);
    setIsAvatarDropdownOpen(false);
    router.push("/");
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white p-4 text-center">
        <h2 className="text-2xl font-black mb-4">الجلسة غير متوفرة</h2>
        <p className="text-slate-500 mb-6 font-bold">يرجى تسجيل الدخول للوصول إلى حسابك.</p>
        <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-xl transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className={`${tajawal.className} min-h-screen bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 flex flex-col`} dir="rtl">
      
      {/* الهيدر الأسطوري */}
      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-2 md:px-4">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-4 border-slate-900 dark:border-black p-2 md:p-3 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex justify-between items-center transition-colors duration-300">
          <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-1 md:pl-2">
            <img src="/logo.svg" alt="الشعار" className="h-12 md:h-16 object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5 md:gap-3">
            <Link href="/#hero" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Home size={16} className="text-slate-500 dark:text-slate-400" /> <span>الرئيسية</span>
            </Link>
            <Link href="/#about-section" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Info size={16} className="text-purple-500" /> <span>عن المنصة</span>
            </Link>
            <Link href="/#games-section" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Gamepad2 size={16} className="text-emerald-500" /> <span>الألعاب والخدمات</span>
            </Link>
            <Link href="/#contact-section" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <MessageCircle size={16} className="text-blue-500" /> <span>تواصل معنا</span>
            </Link>
          </nav>

          <div className="flex gap-1.5 md:gap-2 pr-1 md:pr-2 items-center">
            {userSession && profile ? (
              <div className="relative z-[70]">
                <button 
                  onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                  className="flex items-center gap-1.5 md:gap-2 p-1 pr-2 md:pr-3 bg-slate-100 dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-colors"
                >
                  <span className="text-xs md:text-sm font-black hidden sm:inline-block max-w-[100px] truncate text-slate-800 dark:text-slate-200">
                    {profile.full_name}
                  </span>
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 text-white font-black rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm shadow-inner uppercase">
                    {profile.full_name?.split(' ')[0]?.[0]}{profile.full_name?.split(' ')[1]?.[0] || ""}
                  </div>
                  <ChevronDown size={14} className={`transition-transform text-slate-500 ${isAvatarDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isAvatarDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAvatarDropdownOpen(false)} />
                    <div className="absolute left-0 mt-3 w-56 bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-slate-950 rounded-2xl shadow-[4px_4px_0px_#000] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs font-bold text-slate-400">مسجل الدخول كـ</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{profile.email}</p>
                      </div>
                      <div className="relative flex flex-col py-2">
                        <div className="absolute -top-3 left-6 w-5 h-5 bg-white dark:bg-slate-800 border-t border-r border-slate-100 dark:border-slate-700 transform -rotate-45 z-0"></div>
                        <div className="relative z-10">
                          <Link href="/profile" className="block px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                            حسابي
                          </Link>
                          <div className="mx-6 border-b border-red-500/60 dark:border-red-500/40 my-1"></div>
                          <Link href="/my-games" className="block px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                            ألعابي
                          </Link>
                          <div className="mx-6 border-b border-red-500/60 dark:border-red-500/40 my-1"></div>
                          <button onClick={handleLogout} className="w-full flex items-center justify-between px-6 py-2.5 text-slate-800 dark:text-white hover:text-red-600 transition-colors">
                            <LogOut size={18} className="text-slate-600 dark:text-slate-400" />
                            <span className="text-base font-bold">خروج</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/player" className="flex items-center justify-center gap-1.5 px-3 md:px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs md:text-sm transition-all active:translate-y-0.5 border-b-2 border-blue-800 active:border-b-0">
                <User size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">دخول المنظم</span>
              </Link>
            )}

            <button onClick={toggleTheme} className="w-10 h-10 md:w-11 md:h-11 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 text-slate-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-0.5 active:border-b-0">
              {isDark ? <Sun size={20} className="animate-spin-slow" /> : <Moon size={20} className="animate-wiggle" />}
            </button>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي لحسابي */}
      <main className="flex-1 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          
          {/* زر الرجوع المعتمد */}
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-8 px-8 py-3 bg-[#f42a57] hover:bg-[#e01b45] text-white font-black text-xl rounded-full border-4 border-[#0f172a] shadow-[0px_6px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-[0px_4px_0px_#0f172a] active:translate-y-[6px] active:shadow-none transition-all">
            <span>رجوع</span>
            <ArrowRight size={26} strokeWidth={3} />
          </Link>
          
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border-4 border-slate-900 dark:border-black p-6 md:p-10 shadow-[8px_8px_0px_#000]">
            <h1 className="text-2xl md:text-3xl font-black mb-8 flex items-center gap-3">
              <Settings className="text-blue-500 w-8 h-8" /> إعدادات حسابي
            </h1>
            
            <div className="flex flex-col gap-5 mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-black text-slate-500 dark:text-slate-400 mb-2">الاسم الثنائي</label>
                  <input type="text" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} maxLength={24} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-base font-bold outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-500 dark:text-slate-400 mb-2">البريد الإلكتروني (أساسي لا يتغير)</label>
                <input type="email" value={profile?.email || ""} disabled className="w-full bg-slate-100 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-base font-bold text-slate-400 cursor-not-allowed outline-none" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-500 dark:text-slate-400 mb-2">رقم الجوال</label>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-base font-bold outline-none focus:border-blue-500 text-left text-slate-900 dark:text-white" dir="ltr" />
              </div>
            </div>
            
            <button onClick={handleSaveChanges} disabled={saveLoading} className="w-full py-4 bg-blue-600 border-b-4 border-blue-800 hover:bg-blue-500 text-white font-black text-lg rounded-xl flex items-center justify-center gap-2 transition-all active:translate-y-1 active:border-b-0 disabled:opacity-50">
              <Save size={20} /> {saveLoading ? "جاري الحفظ..." : "حفظ التغييرات الجديدة"}
            </button>
          </div>
        </div>

        {notification.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 max-w-md w-full shadow-2xl border-2 border-slate-100 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'}`}>
                {notification.type === 'success' ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                )}
              </div>
              <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">{notification.type === 'success' ? 'ممتاز!' : 'تنبيه'}</h3>
              <p className="text-center text-slate-600 dark:text-slate-300 font-bold mb-6">{notification.message}</p>
              <button onClick={() => setNotification({ ...notification, isOpen: false })} className={`w-full py-4 rounded-xl font-black text-white transition-all active:scale-95 ${notification.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </main>

      {/* الفوتر الأسطوري */}
      <footer className="w-full bg-white dark:bg-slate-800 border-t-8 border-slate-200 dark:border-slate-950 pt-12 md:pt-16 pb-8 relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-8 mb-12">
          <div className="flex flex-col items-center sm:items-start gap-4">
            <img src="/logo.svg" alt="الشعار" className="h-16 md:h-20 object-contain" />
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm text-center sm:text-right mt-2 leading-relaxed max-w-xs">منصة ألعاب تفاعلية تجمع العائلة والأصدقاء في لحظات مليئة بالحماس والضحك.</p>
            <a href="https://x.com/LudnSA" target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all border-b-2 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-0.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.95H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-4">
            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">روابط سريعة</h3>
            <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
              <li><Link href="/#hero" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-blue-500" /> الرئيسية</Link></li>
              <li><Link href="/#about-section" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-purple-500" /> عن المنصة</Link></li>
              <li><Link href="/#games-section" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-emerald-500" /> الألعاب والخدمات</Link></li>
              <li><Link href="/#contact-section" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-2"><ChevronDown size={16} className="-rotate-90 text-amber-500" /> تواصل معنا</Link></li>
            </ul>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-4 sm:col-span-2 md:col-span-1">
            <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">الألعاب والخدمات</h3>
            <ul className="flex flex-col gap-3 font-bold text-sm md:text-base text-slate-600 dark:text-slate-300">
              <li><Link href="/games/castle-war" className="hover:text-rose-500 transition-colors flex items-center gap-2"><Swords size={18} className="text-rose-500" /> حرب القلاع</Link></li>
              <li><Link href="/games/world-domination" className="hover:text-blue-500 transition-colors flex items-center gap-2"><Globe size={18} className="text-blue-500" /> السيطرة على العالم</Link></li>
              <li><Link href="/games/auction" className="hover:text-amber-500 transition-colors flex items-center gap-2"><Gavel size={18} className="text-amber-500" /> حرب المزايدات</Link></li>
            </ul>
          </div>
        </div>
        <div className="w-full pt-8 border-t-4 border-slate-200 dark:border-slate-700 text-center px-4">
          <p className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500">2026 لدن التقنية - جميع الحقوق محفوظة ©</p>
        </div>
      </footer>
    </div>
  );
}