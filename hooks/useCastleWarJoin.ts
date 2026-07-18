"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";

export const TOTAL_SOLDIERS = 120;
export const ROOMS_COUNT = 15;

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
        
        if (savedRoom === codeFromUrl) {
          const savedStep = sessionStorage.getItem("cw_player_step") as any;
          const savedTeam = sessionStorage.getItem("cw_player_team");
          if (savedTeam) setSelectedTeam(parseInt(savedTeam) as 1 | 2);
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
    const channel = supabase.channel(`join_${roomCode}`)
      .on(
        "postgres_changes", { event: "UPDATE", schema: "public", table: "cw_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          const newRecord = payload.new;
          if (newRecord.live_sync?.team1Joined) setTeam1Joined(true);
          if (newRecord.live_sync?.team2Joined) setTeam2Joined(true);
          if (newRecord.team1_setup) setTeam1Ready(true);
          if (newRecord.team2_setup) setTeam2Ready(true);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
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
    
    const { data } = await supabase.from("cw_rooms").select("live_sync").eq("room_code", roomCode).single();
    if (data) {
       const updatedLiveSync = { ...data.live_sync };
       if (team === 1) updatedLiveSync.team1Joined = true;
       if (team === 2) updatedLiveSync.team2Joined = true;
       await supabase.from("cw_rooms").update({ live_sync: updatedLiveSync }).eq("room_code", roomCode);
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