"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";

export const TOTAL_SOLDIERS = 120;
export const ROOMS_COUNT = 15;

const RESET_NOTICE = "الحكم صفّر اللعبة، وزّع جيشك من جديد";
/** جوالين يرجعون مع بعض بعد التصفير: الثاني يتأخر شوي عشان كتابته ما تمسح علامة الأول */
const REJOIN_STAGGER_MS = 400;

type CwSupabase = ReturnType<typeof getSupabaseBrowser>;

/** يسجل في live_sync إن الفريق مأخوذ، فيتقفل عند باقي الجوالات */
async function markTeamJoined(supabase: CwSupabase, code: string, team: 1 | 2, onlyIfSynced = false) {
  const { data } = await supabase.from("cw_rooms").select("live_sync").eq("room_code", code).single();
  if (!data || (onlyIfSynced && !data.live_sync)) return;
  const updatedLiveSync = { ...data.live_sync };
  if (team === 1) updatedLiveSync.team1Joined = true;
  if (team === 2) updatedLiveSync.team2Joined = true;
  await supabase.from("cw_rooms").update({ live_sync: updatedLiveSync }).eq("room_code", code);
}

/** الحكم يكتب live_sync كامل بعد التصفير فتنمسح العلامة، والجوال الراجع يعيد قفل فريقه */
function rejoinAfterReset(supabase: CwSupabase, code: string, team: 1 | 2) {
  setTimeout(() => { void markTeamJoined(supabase, code, team, true); }, team === 2 ? REJOIN_STAGGER_MS : 0);
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
            if (data.live_sync) rejoinAfterReset(supabase, codeFromUrl, restoredTeam);
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

    // فاته حدث التصفير (الجوال كان مقفل أو الاتصال انقطع): يقارن باللي في القاعدة
    const recheckRoom = async () => {
      const stepAtStart = latest.current.step;
      if (stepAtStart !== "done" && stepAtStart !== "selectTeam") return;
      const { data, error } = await supabase.from("cw_rooms").select("live_sync, team1_setup, team2_setup").eq("room_code", roomCode).single();
      if (error || !data || latest.current.step !== stepAtStart) return;
      const { selectedTeam: team, team1Ready: had1, team2Ready: had2 } = latest.current;

      if (stepAtStart === "done") {
        if (!team || (team === 1 ? data.team1_setup : data.team2_setup)) return;
        applyHostReset();
        if (data.live_sync) {
          rejoinPendingRef.current = false;
          rejoinAfterReset(supabase, roomCode, team);
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

    const channel = supabase.channel(`join_${roomCode}`)
      .on(
        "postgres_changes", { event: "UPDATE", schema: "public", table: "cw_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
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
            if (!newRecord.live_sync[team === 1 ? "team1Joined" : "team2Joined"]) rejoinAfterReset(supabase, roomCode, team);
          }
          if (newRecord.live_sync?.team1Joined) setTeam1Joined(true);
          if (newRecord.live_sync?.team2Joined) setTeam2Joined(true);
          if (newRecord.team1_setup) setTeam1Ready(true);
          if (newRecord.team2_setup) setTeam2Ready(true);
        }
      ).subscribe((status) => {
        if (status === "SUBSCRIBED") void recheckRoom();
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void recheckRoom();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void recheckRoom();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
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

    await markTeamJoined(supabase, roomCode, team);
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

    const teamData = {
      name: selectedTeam === 1 ? team1Name : team2Name,
      rooms: rooms,
      commanderRoom: commanderRoom,
      trapRoom: trapRoom,
      roomCode: roomCode,
    };

    const updateField = selectedTeam === 1 ? { team1_setup: teamData } : { team2_setup: teamData };
    const { error } = await supabase.from("cw_rooms").update(updateField).eq("room_code", roomCode);

    setIsSubmitting(false);
    if (!error) setStep("done");
    else toast.error("حدث خطأ أثناء إرسال الخطة للسيرفر، حاول مرة أخرى.");
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