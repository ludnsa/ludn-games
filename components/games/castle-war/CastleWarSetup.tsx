"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cairo } from "next/font/google";
import { AlertCircle, Loader2, Play } from "lucide-react";
import AccessLoadingScreen from "@/components/games/shared/AccessLoadingScreen";
import { BTN_GOLD, CARD, ERROR, FIELD, H_PAGE, LABEL } from "@/components/games/mafia/mafiaUi";
import { CASTLE_CARDS } from "@/constants/castle-war";
import { useGameAccess } from "@/hooks/shared/useGameAccess";
import { createCastleRoom } from "@/hooks/useCastleWar";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const GAME_ID = "castle-war";
const DEFAULT_TEAM1 = "الفريق الأول";
const DEFAULT_TEAM2 = "الفريق الثاني";
const CREATE_ERROR = "ما قدرنا ننشئ الغرفة، تأكد من الاتصال وحاول مرة ثانية.";

/**
 * صفحة إعداد حرب القلاع، بنفس شكل إعداد المافيا (mafiaUi و ludn-fan).
 * فتحها ما يكتب شي في القاعدة ولا يحسب شي: الفحص هنا قراءة فقط،
 * والغرفة تنشأ من الزر، والاحتساب عند "بدء الحرب" في useCastleWar.
 */
export default function CastleWarSetup({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const { checkAccess } = useGameAccess();
  const [userId, setUserId] = useState<string | null>(null);
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // نفس فحص الدخول للعبة: بدون حساب لصفحة الدخول، وبدون رصيد للباقات
  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await getSupabaseBrowser().auth.getUser();
      if (!user) {
        router.push("/player");
        return;
      }
      const access = await checkAccess(GAME_ID, user.id);
      if (!access.allowed) router.push("/packages");
      else setUserId(user.id);
    };
    check();
    // يتفحص مرة وحدة عند الفتح
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !userId) return;
    setBusy(true);
    setError("");

    const access = await checkAccess(GAME_ID, userId);
    if (!access.allowed && access.reason === "no_tokens") {
      router.push("/packages");
      return;
    }

    const created = access.allowed && (await createCastleRoom(team1.trim() || DEFAULT_TEAM1, team2.trim() || DEFAULT_TEAM2));
    if (created) {
      onCreated();
      return;
    }
    setError(CREATE_ERROR);
    setBusy(false);
  };

  if (!userId) return <AccessLoadingScreen />;

  const card = "shrink-0 aspect-[512/693] rounded-xl shadow-[0_14px_30px_rgba(0,0,0,0.6)] select-none";

  return (
    <main className={`dark min-h-[100dvh] text-ludn-fg p-4 md:p-6 flex flex-col relative z-10 ${cairo.className}`} dir="rtl">
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="grid justify-items-center gap-1 text-center mb-4">
          {/* الصف من اليمين: الجاسوس، ثم القائد في النص، ثم الفخ */}
          {/* eslint-disable @next/next/no-img-element */}
          <div aria-hidden className="flex justify-center items-end h-[186px] mb-1.5">
            <img src={CASTLE_CARDS.spy.card} alt="" draggable={false} className={`${card} w-[100px] max-[340px]:w-[84px] ludn-fan-r`} />
            <img
              src={CASTLE_CARDS.commander.card}
              alt=""
              draggable={false}
              className={`${card} w-[122px] max-[340px]:w-[104px] relative z-[2] ludn-fan-mid shadow-[0_16px_36px_rgba(0,0,0,0.7),0_0_34px_rgba(226,184,74,0.35)]`}
            />
            <img src={CASTLE_CARDS.trap.card} alt="" draggable={false} className={`${card} w-[100px] max-[340px]:w-[84px] ludn-fan-l`} />
          </div>
          {/* eslint-enable @next/next/no-img-element */}
          <h1 className={H_PAGE}>حرب القلاع</h1>
          <p className="text-sm font-semibold leading-relaxed text-ludn-fg/85 max-w-[28ch]">هاجم ودافع، ودمّر قلاع خصمك</p>
        </div>

        <form onSubmit={create} className="flex flex-col gap-3">
          <div className={`${CARD} grid gap-4`}>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>اسم الفريق الأول</span>
              <input value={team1} onChange={(e) => setTeam1(e.target.value)} placeholder={DEFAULT_TEAM1} className={FIELD} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={LABEL}>اسم الفريق الثاني</span>
              <input value={team2} onChange={(e) => setTeam2(e.target.value)} placeholder={DEFAULT_TEAM2} className={FIELD} />
            </label>
            {error && (
              <p className={ERROR}>
                <AlertCircle size={18} className="shrink-0" /> {error}
              </p>
            )}
          </div>

          <button type="submit" disabled={busy} className={BTN_GOLD}>
            {busy ? <Loader2 className="animate-spin" size={20} /> : <Play size={18} className="fill-current" />}
            إنشاء الغرفة
          </button>
        </form>
      </div>
    </main>
  );
}
