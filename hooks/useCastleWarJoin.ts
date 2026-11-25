"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { startBackupRead, type BackupReadCtx } from "@/lib/game/room-backup-read";
import { castleDeviceId, postCastle, readCastleTeamToken, saveCastleTeamToken, type CastleApiResult } from "@/lib/game/castle-client";

export const TOTAL_SOLDIERS = 120;
export const ROOMS_COUNT = 15;

const RESET_NOTICE = "الحكم صفّر اللعبة، وزّع جيشك من جديد";
/** جوالين يرجعون مع بعض بعد التصفير: الثاني يتأخر شوي عشان كتابته ما تمسح علامة الأول */
const REJOIN_STAGGER_MS = 400;

/**
 * الجوال ياخذ الفريق من السيرفر (app/api/castle): لو فاضي ينحجز لهالجهاز وياخذ token، والسيرفر يحط علامة
 * "الفريق دخل" بـ live_sync فيتقفل عند باقي الجوالات. ولو الجهاز ماسكه أصلاً (رجع بعد تحديث أو تصفير) يرسل الـ token.
 */
async function markTeamJoined(code: string, team: 1 | 2): Promise<CastleApiResult<{ token: string }>> {
  const res = await postCastle<{ token: string }>("team-join", {
    roomCode: code, team, deviceId: castleDeviceId(), token: readCastleTeamToken(code, team),
  });
  if (res.success && res.data?.token) saveCastleTeamToken(code, team, res.data.token);
  return res;
}

/** التصفير يفك الفرق، والجوال الراجع يعيد حجز فريقه */
function rejoinAfterReset(code: string, team: 1 | 2) {
  setTimeout(() => { void markTeamJoined(code, team); }, team === 2 ? REJOIN_STAGGER_MS : 0);
}

export function useCastleWarJoin() {
  const supabase = getSupabaseBrowser();
  const [step, setStep] = useState<"enterCode" | "selectTeam" | "setup" | "done">("enterCode");
  const [roomCode, setRoomCode] = useState("");
  const [team1Name, setTeam1Name] = useState("الفريق الأول");
  const [team2Name, setTeam2Name] = useState("الفريق الثاني");
  const [team1Ready, setTeam1Ready] = useState(false);
  const [team2Ready, setTeam2Ready] = useState(false);
  const [team1Joined, setTeam1Joined] = useState(false);
  const [team2Joined, setTeam2Joined] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<1 | 2 | null>(null);
  const [rooms, setRooms] = useState<number[]>(Array(ROOMS_COUNT).fill(0));
  const [commanderRoom, setCommanderRoom] = useState<number | null>(null);
  const [trapRoom, setTrapRoom] = useState<number | null>(null);
  const [activeRoomIdx, setActiveRoomIdx] = useState<number | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // المستمع يشتغل من اشتراك واحد، ويحتاج آخر قيمة
  const latest = useRef({ step, selectedTeam, team1Ready, team2Ready });
  useEffect(() => {
    latest.current = { step, selectedTeam, team1Ready, team2Ready };
  }, [step, selectedTeam, team1Ready, team2Ready]);
  // رجع لفريقه بعد التصفير: ينتظر أول مزامنة من الحكم ويقفل الفريق من جديد
  const rejoinPendingRef = useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("player_theme");
    const prefersDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    const checkUrlCode = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("code");

      if (codeFromUrl) {
        setRoomCode(codeFromUrl);
        
        const savedRoom = sessionStorage.getItem("cw_player_room");
        let initialStep: "selectTeam" | "setup" | "done" = "selectTeam";
        let restoredTeam: 1 | 2 | null = null;

        if (savedRoom === codeFromUrl) {
          const savedStep = sessionStorage.getItem("cw_player_step") as any;
          const savedTeam = sessionStorage.getItem("cw_player_team");
          if (savedTeam) {
            restoredTeam = parseInt(savedTeam) as 1 | 2;
            setSelectedTeam(restoredTeam);
          }
          if (savedStep) initialStep = savedStep;
        } else {
          sessionStorage.setItem("cw_player_room", codeFromUrl);
          sessionStorage.removeItem("cw_player_step");
          sessionStorage.removeItem("cw_player_team");
        }

        const { data, error } = await supabase
          .from("cw_rooms")
          .select("room_code, live_sync, team1_setup, team2_setup")
          .eq("room_code", codeFromUrl)
          .single();

        if (error || !data) {
          toast.error("⚠️ عذراً، هذه الغرفة غير موجودة أو انتهت.");
        } else {
          if (data.live_sync?.team1Name) setTeam1Name(data.live_sync.team1Name);
          if (data.live_sync?.team2Name) setTeam2Name(data.live_sync.team2Name);
          if (data.live_sync?.team1Joined) setTeam1Joined(true);
          if (data.live_sync?.team2Joined) setTeam2Joined(true);
          if (data.team1_setup) setTeam1Ready(true);
          if (data.team2_setup) setTeam2Ready(true);
          
          // If already done on backend, but local step is not done, we should maybe still honor local step unless it conflicts
          if (initialStep === "selectTeam" && ((data.live_sync?.team1Joined && !data.live_sync?.team2Joined) || (!data.live_sync?.team1Joined && data.live_sync?.team2Joined))) {
              // Wait, if it's already joined by someone else, we just show it's locked.
          }
          // اعتمد خطته قبل، والحكم صفّر بعدها: يرجع لتوزيع فريقه مو "تم اعتماد الخطة"
          if (initialStep === "done" && restoredTeam && !(restoredTeam === 1 ? data.team1_setup : data.team2_setup)) {
            initialStep = "setup";
            toast.info(RESET_NOTICE, { id: RESET_NOTICE });
            if (data.live_sync) rejoinAfterReset(codeFromUrl, restoredTeam);
            else rejoinPendingRef.current = true;
          }
          setStep(initialStep);
        }
      }
    };
    checkUrlCode();
  }, []);

  useEffect(() => {
    if (step !== "enterCode") {
      sessionStorage.setItem("cw_player_step", step);
    }
    if (selectedTeam) {
      sessionStorage.setItem("cw_player_team", selectedTeam.toString());
    }
  }, [step, selectedTeam]);

  useEffect(() => {
    if (!roomCode) return;

    // الحكم صفّر: الفرق تنفتح، واللي اعتمد خطته يرجع لتوزيع فريقه من الصفر
    const applyHostReset = () => {
      setTeam1Ready(false);
      setTeam2Ready(false);
      setTeam1Joined(false);
      setTeam2Joined(false);
      const { step: current, selectedTeam: team } = latest.current;
      if (current === "done") {
        setRooms(Array(ROOMS_COUNT).fill(0));
        setCommanderRoom(null);
        setTrapRoom(null);
        setActiveRoomIdx(null);
        setStep("setup");
        toast.info(RESET_NOTICE, { id: RESET_NOTICE });
      }
      rejoinPendingRef.current = (current === "done" || current === "setup") && team !== null;
    };

    // فاته حدث التصفير (الجوال كان مقفل أو الاتصال انقطع أو فاته تحديث): يقارن باللي في القاعدة.
    // القراءة الاحتياطية تشغّلها: لما يرجع البث، ولما يرجع للتبويب أو يرجع النت، وفحص دوري خفيف.
    // لو وصل تحديث من البث وهي بالطريق، ردها ممكن يكون أقدم منه فنتركه
    const recheckRoom = async ({ signal, isFresh }: BackupReadCtx) => {
      const stepAtStart = latest.current.step;
      if (stepAtStart !== "done" && stepAtStart !== "selectTeam") return;
      const { data, error } = await supabase.from("cw_rooms").select("live_sync, team1_setup, team2_setup").eq("room_code", roomCode).abortSignal(signal).single();
      if (error || !data || latest.current.step !== stepAtStart || !isFresh()) return;
      const { selectedTeam: team, team1Ready: had1, team2Ready: had2 } = latest.current;

      if (stepAtStart === "done") {
        if (!team || (team === 1 ? data.team1_setup : data.team2_setup)) return;
        applyHostReset();
        if (data.live_sync) {
          rejoinPendingRef.current = false;
          rejoinAfterReset(roomCode, team);
        }
        return;
      }
      // اختيار الفريق: خطة كانت معتمدة وانمسحت يعني تصفير. أما علامة الدخول لحالها فالحكم يمسحها بأي تحديث، فما تكفي دليل
      if ((had1 && !data.team1_setup) || (had2 && !data.team2_setup)) applyHostReset();
      if (data.live_sync?.team1Joined) setTeam1Joined(true);
      if (data.live_sync?.team2Joined) setTeam2Joined(true);
      if (data.team1_setup) setTeam1Ready(true);
      if (data.team2_setup) setTeam2Ready(true);
    };

    const backup = startBackupRead(recheckRoom);

    const channel = supabase.channel(`join_${roomCode}`)
      .on(
        "postgres_changes", { event: "UPDATE", schema: "public", table: "cw_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          backup.onEvent();
          const newRecord = payload.new;
          // التصفير بس يكتب الثلاثة فاضية مع بعض (resetGame). ما نكتفي بخطة فاضية:
          // تحديث قديم يوصل متأخر ممكن يكون قبل اعتماد الخطة، فيرجّع اللاعب بالغلط
          if (newRecord.live_sync === null && newRecord.team1_setup === null && newRecord.team2_setup === null) {
            applyHostReset();
            return;
          }
          const team = latest.current.selectedTeam;
          if (rejoinPendingRef.current && team && newRecord.live_sync) {
            rejoinPendingRef.current = false;
            // لو فتح الصفحة قبل مزامنة الحكم الأسماء ما وصلته، والخطة ترسل اسم الفريق للحكم
            if (newRecord.live_sync.team1Name) setTeam1Name(newRecord.live_sync.team1Name);
            if (newRecord.live_sync.team2Name) setTeam2Name(newRecord.live_sync.team2Name);
            if (!newRecord.live_sync[team === 1 ? "team1Joined" : "team2Joined"]) rejoinAfterReset(roomCode, team);
          }
          if (newRecord.live_sync?.team1Joined) setTeam1Joined(true);
          if (newRecord.live_sync?.team2Joined) setTeam2Joined(true);
          if (newRecord.team1_setup) setTeam1Ready(true);
          if (newRecord.team2_setup) setTeam2Ready(true);
        }
      ).subscribe((status) => backup.onStatus(status));

    // رجعت الصفحة من ذاكرة المتصفح (زر الرجوع): نقارن على طول
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) backup.readNow();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      backup.stop();
      supabase.removeChannel(channel);
    };
  }, [roomCode, supabase]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("player_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("player_theme", "light");
      }
      return next;
    });
  };

  const handleEnterRoom = async () => {
    if (roomCode.length !== 5) return;
    setIsCheckingCode(true);

    const { data, error } = await supabase
      .from("cw_rooms")
      .select("room_code, live_sync, team1_setup, team2_setup")
      .eq("room_code", roomCode)
      .single();

    if (error || !data) {
      toast.error("الكود غير صحيح أو الغرفة غير موجودة!");
      setIsCheckingCode(false);
      return;
    }

    if (data.live_sync?.team1Name) setTeam1Name(data.live_sync.team1Name);
    if (data.live_sync?.team2Name) setTeam2Name(data.live_sync.team2Name);
    if (data.live_sync?.team1Joined) setTeam1Joined(true);
    if (data.live_sync?.team2Joined) setTeam2Joined(true);
    if (data.team1_setup) setTeam1Ready(true);
    if (data.team2_setup) setTeam2Ready(true);

    setIsCheckingCode(false);
    sessionStorage.setItem("cw_player_room", roomCode);
    setStep("selectTeam");
  };

  const handleSelectTeam = async (team: 1 | 2) => {
    setSelectedTeam(team);
    setStep("setup");

    const res = await markTeamJoined(roomCode, team);
    // جوال ثاني سبقه للفريق نفسه (بنفس اللحظة): يرجع لاختيار الفريق، والفريق يتقفل عنده
    if (!res.success && res.code === "full") {
      if (team === 1) setTeam1Joined(true);
      else setTeam2Joined(true);
      setSelectedTeam(null);
      sessionStorage.removeItem("cw_player_team");
      setStep("selectTeam");
      toast.error(res.error);
    }
  };

  const remainingSoldiers = TOTAL_SOLDIERS - rooms.reduce((a, b) => a + b, 0);

  const handleRoomChange = (index: number, change: number) => {
    if (index === commanderRoom || index === trapRoom) return;
    if (change > 0 && remainingSoldiers === 0) return;
    if (change < 0 && rooms[index] === 0) return;
    const newRooms = [...rooms];
    newRooms[index] += change;
    setRooms(newRooms);
  };

  const handleManualInput = (index: number, value: string) => {
    if (index === commanderRoom || index === trapRoom) return;
    let num = parseInt(value);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;

    const currentRoomValue = rooms[index];
    const availableToAdd = remainingSoldiers + currentRoomValue;
    if (num > availableToAdd) num = availableToAdd;

    const newRooms = [...rooms];
    newRooms[index] = num;
    setRooms(newRooms);
  };

  const handleAutoDistribute = () => {
    const newRooms = [...rooms];
    let cRoom = commanderRoom;
    let tRoom = trapRoom;

    if (cRoom === null) {
      const emptiesForC = Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => newRooms[i] === 0 && i !== tRoom);
      cRoom = emptiesForC.length > 0 ? emptiesForC[Math.floor(Math.random() * emptiesForC.length)] : Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => i !== tRoom)[Math.floor(Math.random() * (ROOMS_COUNT - 1))];
    }
    if (tRoom === null) {
      const emptiesForT = Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => newRooms[i] === 0 && i !== cRoom);
      tRoom = emptiesForT.length > 0 ? emptiesForT[Math.floor(Math.random() * emptiesForT.length)] : Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => i !== cRoom)[Math.floor(Math.random() * (ROOMS_COUNT - 1))];
    }

    newRooms[cRoom!] = 0;
    newRooms[tRoom!] = 0;

    let remain = TOTAL_SOLDIERS - newRooms.reduce((a, b) => a + b, 0);
    let availableRooms = Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => i !== cRoom && i !== tRoom && newRooms[i] === 0);

    if (availableRooms.length === 0 && remain > 0) {
      availableRooms = Array.from({ length: ROOMS_COUNT }, (_, i) => i).filter((i) => i !== cRoom && i !== tRoom);
    }

    while (remain > 0 && availableRooms.length > 0) {
      const randomIdx = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      newRooms[randomIdx]++;
      remain--;
    }

    setRooms(newRooms);
    setCommanderRoom(cRoom);
    setTrapRoom(tRoom);
    setActiveRoomIdx(null);
  };

  const handleReset = () => {
    setRooms(Array(ROOMS_COUNT).fill(0));
    setCommanderRoom(null);
    setTrapRoom(null);
    setActiveRoomIdx(null);
  };

  const assignSpecialRole = (index: number, role: "commander" | "trap") => {
    if (rooms[index] > 0) {
      const newRooms = [...rooms];
      newRooms[index] = 0;
      setRooms(newRooms);
    }
    if (role === "commander") {
      if (trapRoom === index) setTrapRoom(null);
      setCommanderRoom(index);
    } else {
      if (commanderRoom === index) setCommanderRoom(null);
      setTrapRoom(index);
    }
  };

  const isSetupValid = remainingSoldiers === 0 && commanderRoom !== null && trapRoom !== null && commanderRoom !== trapRoom;

  const submitData = async () => {
    if (!isSetupValid || !selectedTeam) return;
    setIsSubmitting(true);

    // الخطة للسيرفر بس (ما تنحفظ بالغرفة اللي يقراها الكل)، بالـ token اللي أخذه الجوال لما اختار فريقه.
    // لو ما عنده token (طلب الاختيار ما وصل) يحجز الفريق أول
    if (!readCastleTeamToken(roomCode, selectedTeam)) await markTeamJoined(roomCode, selectedTeam);
    const res = await postCastle("team-plan", {
      roomCode,
      team: selectedTeam,
      deviceId: castleDeviceId(),
      token: readCastleTeamToken(roomCode, selectedTeam),
      plan: { rooms, commanderRoom, trapRoom },
      name: selectedTeam === 1 ? team1Name : team2Name,
    });

    setIsSubmitting(false);
    if (res.success) setStep("done");
    else toast.error(res.code === "lost" || res.code === "closed" ? res.error : "حدث خطأ أثناء إرسال الخطة للسيرفر، حاول مرة أخرى.");
  };

  return {
    step, setStep, roomCode, setRoomCode, team1Name, team2Name, team1Ready, team2Ready,
    team1Joined, team2Joined,
    selectedTeam, setSelectedTeam, rooms, setRooms, commanderRoom, setCommanderRoom,
    trapRoom, setTrapRoom, activeRoomIdx, setActiveRoomIdx, isCheckingCode, isSubmitting,
    isDarkMode, remainingSoldiers, isSetupValid,
    toggleTheme, handleEnterRoom, handleRoomChange, handleManualInput, handleAutoDistribute,
    handleReset, assignSpecialRole, submitData, handleSelectTeam
  };
}