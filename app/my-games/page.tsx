"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { fetchMyPlanAction, fetchUserGamesAction, fetchUserProfileAction } from "@/app/actions/gameAccess";
import { CalendarClock, Gift, Zap } from "lucide-react";
import Link from "next/link";
import { QUIZ_GAME } from "@/constants/quiz-grid";
import { formatPlanDate, isSubscriptionActive, subscriptionDaysLeft } from "@/lib/packages";
import { useRouter } from "next/navigation";
import { SitePage, PageHeading } from "@/components/home/SitePage";
import { GameArt, type GameArtKind } from "@/components/home/GameArt";
import { BTN_GOLD, CARD, SPINNER } from "@/components/home/ui";

export default function MyGamesPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [userSession, setUserSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTokens, setAvailableTokens] = useState<number>(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          setLoading(false);
          return;
        }

        setUserSession(user);

        // جلب بيانات الحساب باستخدام Server Action لتخطي الـ RLS
        const [profileData, plan] = await Promise.all([fetchUserProfileAction(user.id), fetchMyPlanAction()]);
        const userProfile = profileData || {
          full_name: user.user_metadata?.full_name || "لاعب جديد",
        };
        setProfile({ ...userProfile, email: user.email });
        setAvailableTokens(profileData?.available_tokens || 0);
        setEndsAt(plan?.endsAt ?? null);

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

  // بعد الخروج من قائمة الحساب يرجع للرئيسية زي ما كان
  const goHome = () => router.push("/");

  if (loading) {
    return (
      <SitePage width="max-w-3xl" afterLogout={goHome}>
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

  // الألعاب اللي يفتحها الاشتراك — كل وحدة لها تجربة مجانية
  // full: نفس معناها بالرئيسية — صورة الغلاف تطلع كاملة بدون قص وتكبير
  const gamesList: { id: string; title: string; art?: GameArtKind; img?: string; full?: boolean }[] = [
    { id: QUIZ_GAME.id, title: QUIZ_GAME.title, art: 'quiz' },
    { id: 'auction', title: 'المزاد', art: 'auction' },
    { id: 'castle-war', title: 'حرب القلاع', img: '/games/castle-war/castle-war-cover.webp', full: true },
    { id: 'world-domination', title: 'السيطرة على العالم', img: '/games/world-domination/world-domination-cover.webp', full: true },
  ];
  const active = isSubscriptionActive(endsAt);

  return (
    <SitePage width="max-w-3xl" afterLogout={goHome}>
      <PageHeading back={{ href: "/", label: "رجوع" }} title="مكتبة ألعابي" />

      <div className="grid gap-4">
        {/* الاشتراك */}
        <div
          className={`${CARD} p-4 md:p-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center ${active ? "border-ludn-gold/50" : ""}`}
        >
          <div className="flex items-center gap-3.5">
            <span className="w-14 h-14 shrink-0 rounded-2xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
              {active ? <CalendarClock className="w-7 h-7" /> : <Zap className="w-7 h-7" />}
            </span>
            <div>
              <p className="text-sm font-bold text-ludn-muted">{active ? "اشتراكك فعّال" : "الاشتراك"}</p>
              <p className="font-display text-[30px] leading-tight">
                {active && endsAt ? `باقي ${subscriptionDaysLeft(endsAt)} يوم` : "ما عندك اشتراك"}
              </p>
              {active && endsAt && (
                <p className="text-[13px] font-bold text-ludn-muted">ينتهي {formatPlanDate(endsAt)}</p>
              )}
            </div>
          </div>
          <Link href="/packages" className={`${BTN_GOLD} w-full sm:w-auto`}>
            {active ? "مدّد اشتراكي" : "اشترك"}
          </Link>
        </div>

        {availableTokens > 0 && (
          <p className="rounded-2xl bg-ludn-surface-2 px-4 py-3 text-sm font-bold text-ludn-muted">
            عندك رصيد قديم: <b className="text-ludn-fg tabular-nums">{availableTokens}</b> ألعاب —{" "}
            {active ? "محفوظ لك، ما ينخصم وأنت مشترك" : "ينخصم منه إذا لعبت وما عندك اشتراك"}
          </p>
        )}

        {!active && (
          <div className="rounded-[22px] border border-ludn-green/40 bg-ludn-green/10 p-4 md:p-5 flex items-start gap-3.5">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-ludn-green/20 text-ludn-green grid place-items-center">
              <Gift className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-ludn-green font-black text-lg">كل لعبة لها تجربة مجانية 🎁</h3>
              <p className="text-sm md:text-base font-semibold leading-relaxed text-ludn-fg/85 mt-1">
                تقدر تلعب كل لعبة مرة وحدة ببلاش. اللعبة اللي جربتها، تكمل فيها بالاشتراك.
              </p>
            </div>
          </div>
        )}

        <h2 className="font-display text-[26px] leading-tight mt-2">إحصائيات اللعب</h2>

        <ul className="grid gap-3 sm:grid-cols-2">
          {gamesList.map(game => {
            const userGame = userGames.find(ug => ug.game_id === game.id);
            const playedCount = userGame?.games_played || 0;

            return (
              <li key={game.id} className={`${CARD} p-3 flex items-center gap-3.5`}>
                <span className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden">
                  {game.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.img} alt="" className={`absolute inset-0 w-full h-full object-cover ${game.full ? "" : "object-[50%_20%] scale-125"}`} />
                  ) : (
                    game.art && <GameArt kind={game.art} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-black">{game.title}</h4>
                  {playedCount === 0 && !active && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11.5px] font-black px-2 py-0.5 rounded-full bg-ludn-green/15 text-ludn-green">
                      <Gift size={13} /> تجربة مجانية متاحة
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-center rounded-xl bg-ludn-surface-2 px-3 py-2 min-w-[84px]">
                  <p className="text-[11px] font-bold text-ludn-muted">مرات اللعب</p>
                  <p className="font-display text-[24px] leading-none pt-1 tabular-nums">{playedCount}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SitePage>
  );
}
