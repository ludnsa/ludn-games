"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fetchUserGamesAction, fetchUserProfileAction } from "@/app/actions/gameAccess";
import { 
  Gamepad2, Swords, Globe, Gavel, ArrowRight, Home, Info, 
  MessageCircle, ChevronDown, User, Sun, Moon, LogOut, Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
});

export default function MyGamesPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [userSession, setUserSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTokens, setAvailableTokens] = useState<number>(0);

  // حالات الهيدر
  const [isDark, setIsDark] = useState(true);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));

    const loadData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setLoading(false);
          return;
        }

        setUserSession(user);

        // جلب بيانات الحساب باستخدام Server Action لتخطي الـ RLS
        const profileData = await fetchUserProfileAction(user.id);
        const userProfile = profileData || {
          full_name: user.user_metadata?.full_name || "لاعب جديد",
        };
        setProfile({ ...userProfile, email: user.email });
        setAvailableTokens(profileData?.available_tokens || 0);

        // جلب بيانات الألعاب باستخدام Server Action لتخطي الـ RLS
        const gamesData = await fetchUserGamesAction(user.id);
        setUserGames(gamesData || []);

      } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
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

  const gamesList = [
    { id: 'castle-war', title: 'حرب القلاع', icon: <Swords size={28} />, bg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-500' },
    { id: 'world-domination', title: 'السيطرة على العالم', icon: <Globe size={28} />, bg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-500' },
    { id: 'auction', title: 'حرب المزايدات', icon: <Gavel size={28} />, bg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-500' }
  ];

  return (
    <div className={`${tajawal.className} min-h-screen bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 flex flex-col`} dir="rtl">
      
      {/* الهيدر الأسطوري */}
      <div className="fixed top-4 left-0 right-0 z-[60] w-full max-w-7xl mx-auto px-2 md:px-4">
        <div className="bg-white/95 dark:bg-slate-800/95 rounded-2xl border-4 border-slate-900 dark:border-black p-2 md:p-3 shadow-[6px_6px_0px_#0f172a] dark:shadow-[6px_6px_0px_#000] flex justify-between items-center transition-colors duration-300">
          <Link href="/" className="transition-transform hover:scale-105 active:scale-95 shrink-0 pl-1 md:pl-2">
            <img src="/logo.svg" alt="الشعار" className="h-12 md:h-16 w-auto max-w-[140px] md:max-w-[200px] object-contain" />
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
            <Link href="/packages" className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black text-[11px] md:text-sm text-slate-700 dark:text-slate-300 transition-all active:translate-y-0.5 active:border-b-0">
              <Zap size={16} className="text-amber-500" /> <span>باقات الألعاب</span>
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
                          <Link href="/packages" className="block px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-blue-600 transition-colors">
                            باقات الألعاب
                          </Link>
                          <div className="mx-6 border-b border-red-500/60 dark:border-red-500/40 my-1"></div>
                          <Link href="/guides" className="flex items-center justify-between px-6 py-2.5 text-right text-base font-bold text-slate-800 dark:text-white hover:text-cyan-600 transition-colors">
                            <span>كيف تلعب؟</span>
                            <Info size={16} />
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

      {/* المحتوى الرئيسي لألعابي */}
      <main className="flex-1 text-slate-900 dark:text-white p-4 md:p-8 pt-32 md:pt-40 relative overflow-hidden">
        {/* تأثيرات إضاءة خلفية احترافية */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
          {/* زر الرجوع المعتمد */}
          <Link href="/" className="inline-flex items-center justify-center gap-3 mb-8 px-8 py-3 bg-[#f42a57] hover:bg-[#e01b45] text-white font-black text-xl rounded-full border-4 border-[#0f172a] shadow-[0px_6px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-[0px_4px_0px_#0f172a] active:translate-y-[6px] active:shadow-none transition-all">
            <span>رجوع</span>
            <ArrowRight size={26} strokeWidth={3} />
          </Link>
        
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border-4 border-slate-900 dark:border-black p-6 md:p-10 shadow-[8px_8px_0px_#000]">
            <h1 className="text-2xl md:text-3xl font-black mb-4 flex items-center gap-3">
              <Gamepad2 className="text-purple-500 w-8 h-8" /> مكتبة ألعابي
            </h1>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="text-indigo-500 w-8 h-8" />
                  <div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">رصيد الألعاب المتاح</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{availableTokens} لعبة</p>
                  </div>
                </div>
                <Link href="/packages" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors">
                  شراء باقة
                </Link>
              </div>
            </div>

            {userGames.reduce((acc, game) => acc + (game.games_played || 0), 0) === 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4">
                <div className="bg-emerald-100 dark:bg-emerald-800 p-2 rounded-xl">
                  <Gamepad2 className="text-emerald-600 dark:text-emerald-400 w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-emerald-800 dark:text-emerald-300 font-black text-lg">تجربة مجانية بانتظارك! 🎁</h3>
                  <p className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    لديك تجربة مجانية <span className="underline decoration-wavy underline-offset-4">واحدة</span> يمكنك استخدامها لتجربة أي لعبة تختارها. بعد انتهائها، ستحتاج لشراء باقة للاستمرار باللعب.
                  </p>
                </div>
              </div>
            )}

            <p className="text-base font-bold text-slate-500 dark:text-slate-400 mb-6">
              هنا قائمة بألعابك وإحصائيات لعبك لها:
            </p>
            
            <div className="flex flex-col gap-4">
              {gamesList.map(game => {
                const userGame = userGames.find(ug => ug.game_id === game.id);
                const isPurchased = userGame?.is_purchased || false;
                const playedCount = userGame?.games_played || 0;

                return (
                  <div key={game.id} className="flex items-center justify-between p-4 md:p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 transition-transform hover:-translate-y-1">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-12 h-12 md:w-14 md:h-14 ${game.bg} rounded-xl flex items-center justify-center font-black shrink-0`}>
                        {game.icon}
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black mb-1 text-slate-900 dark:text-white">{game.title}</h4>
                      </div>
                    </div>
                    <div className="text-left bg-white dark:bg-slate-800 p-2.5 md:p-3 rounded-xl border border-slate-100 dark:border-slate-700 min-w-[80px] md:min-w-[100px]">
                      <p className="text-[10px] md:text-xs font-bold text-slate-400 mb-1">مرات اللعب</p>
                      <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{playedCount}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* الفوتر الأسطوري */}
      <footer className="w-full bg-white dark:bg-slate-800 border-t-8 border-slate-200 dark:border-slate-950 pt-12 md:pt-16 pb-8 relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 md:gap-8 mb-12">
          <div className="flex flex-col items-center sm:items-start gap-4">
            <img src="/logo.svg" alt="الشعار" className="h-16 md:h-20 w-auto max-w-[160px] md:max-w-[240px] object-contain" />
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