/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { Cairo } from "next/font/google";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Swords,
  CheckCircle2,
  Crown,
  Bomb,
  Minus,
  Plus,
  Shuffle,
  Lock,
  User,
  AlertCircle,
  MapPin,
  Users,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw,
  Crosshair,
  Skull,
  MonitorPlay,
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "700", "900"] });

const TOTAL_SOLDIERS = 120;
const ROOMS_COUNT = 15;

// إحداثيات غرف القلعة التفاعلية (15 غرفة)
const SVG_ROOMS = [
  { id: 0, cx: 250, cy: 300 },
  { id: 1, cx: 250, cy: 420 },
  { id: 2, cx: 250, cy: 540 },
  { id: 3, cx: 170, cy: 660 },
  { id: 4, cx: 330, cy: 660 },
  { id: 5, cx: 600, cy: 150 },
  { id: 6, cx: 480, cy: 300 },
  { id: 7, cx: 720, cy: 300 },
  { id: 8, cx: 480, cy: 460 },
  { id: 9, cx: 720, cy: 460 },
  { id: 10, cx: 950, cy: 300 },
  { id: 11, cx: 950, cy: 420 },
  { id: 12, cx: 950, cy: 540 },
  { id: 13, cx: 870, cy: 660 },
  { id: 14, cx: 1030, cy: 660 },
];

const SolidGamingBackground = () => {
  const [isDark, setIsDark] = useState(true);
  const [icons, setIcons] = useState<any[]>([]);

  useEffect(() => {
    const checkTheme = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const gameShapes = [
      <svg
        key="1"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="6" y1="12" x2="10" y2="12"></line>
        <line x1="8" y1="10" x2="8" y2="14"></line>
        <line x1="15" y1="13" x2="15.01" y2="13"></line>
        <line x1="18" y1="11" x2="18.01" y2="11"></line>
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      </svg>,
      <svg
        key="2"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <circle cx="15.5" cy="15.5" r="1.5"></circle>
        <circle cx="15.5" cy="8.5" r="1.5"></circle>
        <circle cx="8.5" cy="15.5" r="1.5"></circle>
        <circle cx="12" cy="12" r="1.5"></circle>
      </svg>,
      <svg
        key="3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h4" />
        <path d="M6 20V4h6v4" />
        <circle cx="12" cy="11" r="2" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <line x1="10" y1="15" x2="14" y2="15" />
        <line x1="12" y1="17" x2="10" y2="20" />
        <line x1="12" y1="17" x2="14" y2="20" />
      </svg>,
    ];

    const iconColors = [
      "text-cyan-500",
      "text-rose-500",
      "text-amber-500",
      "text-purple-500",
    ];

    const generatedIcons = Array.from({ length: 8 }).map((_, i) => ({
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

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]">
        {icons.map((icon) => (
          <div
            key={icon.id}
            className={`absolute animate-float-game-extra ${icon.colorClass}`}
            style={{
              left: icon.left,
              top: icon.top,
              width: `${icon.size}px`,
              height: `${icon.size}px`,
              animationDelay: icon.delay,
              animationDuration: icon.duration,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          >
            {icon.shape}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CastleWarJoinPage() {
  const [step, setStep] = useState<
    "enterCode" | "selectTeam" | "setup" | "done"
  >("enterCode");
  const [roomCode, setRoomCode] = useState("");
  const [team1Name, setTeam1Name] = useState("الفريق الأول");
  const [team2Name, setTeam2Name] = useState("الفريق الثاني");
  const [team1Ready, setTeam1Ready] = useState(false);
  const [team2Ready, setTeam2Ready] = useState(false);
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
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
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
        const { data, error } = await supabase
          .from("cw_rooms")
          .select("room_code, live_sync, team1_setup, team2_setup")
          .eq("room_code", codeFromUrl)
          .single();

        if (error || !data) {
          alert("⚠️ عذراً، هذه الغرفة غير موجودة أو انتهت.");
        } else {
          if (data.live_sync?.team1Name) setTeam1Name(data.live_sync.team1Name);
          if (data.live_sync?.team2Name) setTeam2Name(data.live_sync.team2Name);
          if (data.team1_setup) setTeam1Ready(true);
          if (data.team2_setup) setTeam2Ready(true);
          setStep("selectTeam");
        }
      }
    };

    checkUrlCode();
  }, []);

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
      alert("الكود غير صحيح أو الغرفة غير موجودة!");
      setIsCheckingCode(false);
      return;
    }

    if (data.live_sync?.team1Name) setTeam1Name(data.live_sync.team1Name);
    if (data.live_sync?.team2Name) setTeam2Name(data.live_sync.team2Name);
    if (data.team1_setup) setTeam1Ready(true);
    if (data.team2_setup) setTeam2Ready(true);

    setIsCheckingCode(false);
    setStep("selectTeam");
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

    if (num > availableToAdd) {
      num = availableToAdd;
    }

    const newRooms = [...rooms];
    newRooms[index] = num;
    setRooms(newRooms);
  };

  const handleAutoDistribute = () => {
    const newRooms = [...rooms];
    let cRoom = commanderRoom;
    let tRoom = trapRoom;

    if (cRoom === null) {
      const emptiesForC = Array.from(
        { length: ROOMS_COUNT },
        (_, i) => i,
      ).filter((i) => newRooms[i] === 0 && i !== tRoom);
      if (emptiesForC.length > 0) {
        cRoom = emptiesForC[Math.floor(Math.random() * emptiesForC.length)];
      } else {
        const fallbackForC = Array.from(
          { length: ROOMS_COUNT },
          (_, i) => i,
        ).filter((i) => i !== tRoom);
        cRoom = fallbackForC[Math.floor(Math.random() * fallbackForC.length)];
      }
    }

    if (tRoom === null) {
      const emptiesForT = Array.from(
        { length: ROOMS_COUNT },
        (_, i) => i,
      ).filter((i) => newRooms[i] === 0 && i !== cRoom);
      if (emptiesForT.length > 0) {
        tRoom = emptiesForT[Math.floor(Math.random() * emptiesForT.length)];
      } else {
        const fallbackForT = Array.from(
          { length: ROOMS_COUNT },
          (_, i) => i,
        ).filter((i) => i !== cRoom);
        tRoom = fallbackForT[Math.floor(Math.random() * fallbackForT.length)];
      }
    }

    newRooms[cRoom] = 0;
    newRooms[tRoom] = 0;

    let currentTotal = newRooms.reduce((a, b) => a + b, 0);
    let remain = TOTAL_SOLDIERS - currentTotal;

    let availableRoomsForSoldiers = Array.from(
      { length: ROOMS_COUNT },
      (_, i) => i,
    ).filter((i) => i !== cRoom && i !== tRoom && newRooms[i] === 0);

    if (availableRoomsForSoldiers.length === 0 && remain > 0) {
      availableRoomsForSoldiers = Array.from(
        { length: ROOMS_COUNT },
        (_, i) => i,
      ).filter((i) => i !== cRoom && i !== tRoom);
    }

    while (remain > 0 && availableRoomsForSoldiers.length > 0) {
      const randomIdx =
        availableRoomsForSoldiers[
          Math.floor(Math.random() * availableRoomsForSoldiers.length)
        ];
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

  const isSetupValid =
    remainingSoldiers === 0 &&
    commanderRoom !== null &&
    trapRoom !== null &&
    commanderRoom !== trapRoom;

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

    const updateField =
      selectedTeam === 1
        ? { team1_setup: teamData }
        : { team2_setup: teamData };

    const { error } = await supabase
      .from("cw_rooms")
      .update(updateField)
      .eq("room_code", roomCode);

    setIsSubmitting(false);

    if (!error) {
      setStep("done");
    } else {
      alert("حدث خطأ أثناء إرسال الخطة للسيرفر، حاول مرة أخرى.");
    }
  };

  const theme = {
    base: selectedTeam === 1 ? "cyan" : "rose",
    text:
      selectedTeam === 1
        ? "text-cyan-500 dark:text-cyan-400"
        : "text-rose-500 dark:text-rose-400",
    btn:
      selectedTeam === 1
        ? "bg-cyan-500 hover:bg-cyan-400 border-cyan-700"
        : "bg-rose-500 hover:bg-rose-400 border-rose-700",
    lightBg:
      selectedTeam === 1
        ? "bg-cyan-50 dark:bg-cyan-900/20"
        : "bg-rose-50 dark:bg-rose-900/20",
    borderColor:
      selectedTeam === 1
        ? "border-cyan-200 dark:border-cyan-800"
        : "border-rose-200 dark:border-rose-800",
    shadow:
      selectedTeam === 1
        ? "shadow-[0_8px_0_#0e7490] dark:shadow-[0_8px_0_#164e63]"
        : "shadow-[0_8px_0_#be123c] dark:shadow-[0_8px_0_#881337]",
  };

  // دالة عرض القلعة التفاعلية SVG المدمجة في شاشة الجوال
  const renderInteractiveCastle = () => {
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] transition-colors duration-500`}
      >
        <svg
          viewBox="0 -120 1200 1120"
          className="w-full h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="tower3D" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="20%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="roofGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="30%" stopColor="#b45309" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>

            <linearGradient id="team1Glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="team2Glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            <radialGradient id="bgAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.15)" />
              <stop offset="50%" stopColor="rgba(129, 140, 248, 0.05)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" result="blur1" />
              <feGaussianBlur stdDeviation="24" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="deepShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="15"
                stdDeviation="10"
                floodColor="#000000"
                floodOpacity="0.8"
              />
            </filter>
          </defs>

          {/* هالة الخلفية */}
          <rect x="0" y="-120" width="1200" height="1120" fill="#050b14" />
          <circle cx="600" cy="500" r="500" fill="url(#bgAura)" />
          <circle
            cx="600"
            cy="350"
            r="250"
            fill="#1e1b4b"
            opacity="0.3"
            filter="url(#neonGlow)"
          />

          {/* الصورة المدمجة كخلفية إن وجدت */}
          <image
            href="/castle-bg.png"
            x="0"
            y="-120"
            width="1200"
            height="1120"
            preserveAspectRatio="xMidYMid slice"
          />

          {/* هيكل القلعة */}
          <path
            d="M 250 800 L 250 500 L 950 500 L 950 800 Z"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 250 500 L 250 450 L 300 450 L 300 500 L 350 500 L 350 450 L 400 450 L 400 500 L 450 500 L 450 450 L 500 450 L 500 500 L 550 500 L 550 450 L 600 450 L 600 500 L 650 500 L 650 450 L 700 450 L 700 500 L 750 500 L 750 450 L 800 450 L 800 500 L 850 500 L 850 450 L 900 450 L 900 500 L 950 500 Z"
            fill="url(#tower3D)"
          />

          {/* الأبراج */}
          <rect
            x="120"
            y="200"
            width="260"
            height="600"
            rx="10"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 100 800 L 120 700 L 380 700 L 400 800 Z"
            fill="url(#tower3D)"
          />
          <path
            d="M 100 200 L 250 20 L 400 200 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path d="M 90 200 L 410 200 L 410 220 L 90 220 Z" fill="#b45309" />

          <rect
            x="820"
            y="200"
            width="260"
            height="600"
            rx="10"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 800 800 L 820 700 L 1080 700 L 1100 800 Z"
            fill="url(#tower3D)"
          />
          <path
            d="M 800 200 L 950 20 L 1100 200 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 790 200 L 1110 200 L 1110 220 L 790 220 Z"
            fill="#b45309"
          />

          <rect
            x="420"
            y="80"
            width="360"
            height="720"
            rx="15"
            fill="url(#tower3D)"
            filter="url(#deepShadow)"
          />
          <path
            d="M 390 80 L 600 -80 L 810 80 Z"
            fill="url(#roofGradient)"
            filter="url(#deepShadow)"
          />
          <path d="M 380 80 L 820 80 L 820 110 L 380 110 Z" fill="#f59e0b" />

          {/* البوابة والتفاصيل */}
          <path
            d="M 480 800 L 480 620 A 120 120 0 0 1 720 620 L 720 800 Z"
            fill="#020617"
            stroke={selectedTeam === 1 ? "#0891b2" : "#e11d48"}
            strokeWidth="8"
            filter="url(#neonGlow)"
          />
          <path
            d="M 540 800 L 540 620 A 60 60 0 0 1 660 620 L 660 800"
            fill="none"
            stroke={selectedTeam === 1 ? "#22d3ee" : "#fb7185"}
            strokeWidth="4"
            opacity="0.6"
          />
          <circle
            cx="600"
            cy="710"
            r="30"
            fill={selectedTeam === 1 ? "url(#team1Glow)" : "url(#team2Glow)"}
            filter="url(#neonGlow)"
          />
          <circle cx="600" cy="710" r="15" fill="#ffffff" />

          {/* القاعدة المستطيلة */}
          <rect
            x="80"
            y="800"
            width="1040"
            height="40"
            rx="5"
            fill="#0f172a"
            filter="url(#deepShadow)"
          />
          <rect
            x="40"
            y="840"
            width="1120"
            height="60"
            rx="10"
            fill="#020617"
            filter="url(#deepShadow)"
          />

          {/* الرسومات التجميلية */}
          <foreignObject x="560" y="520" width="80" height="80">
            <Swords className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>
          <foreignObject x="420" y="740" width="40" height="40">
            <Skull className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>
          <foreignObject x="740" y="740" width="40" height="40">
            <Skull className="text-slate-500 w-full h-full opacity-60" />
          </foreignObject>

          {/* رسم الغرف التفاعلية للوحة التحكم */}
          {SVG_ROOMS.map((room) => {
            const isCommander = commanderRoom === room.id;
            const isTrap = trapRoom === room.id;
            const count = rooms[room.id];
            const isActive = activeRoomIdx === room.id;
            const glowColor =
              selectedTeam === 1 ? "url(#team1Glow)" : "url(#team2Glow)";
            const strokeColor = isActive
              ? "stroke-amber-400"
              : selectedTeam === 1
                ? "stroke-cyan-500"
                : "stroke-rose-500";

            return (
              <g
                key={room.id}
                onClick={() => setActiveRoomIdx(room.id)}
                className={`cursor-pointer transition-transform duration-200 ease-out will-change-transform group ${isActive ? "scale-[1.12] z-20" : "hover:scale-[1.05] z-10"}`}
                style={{ transformOrigin: `${room.cx}px ${room.cy}px` }}
              >
                <path
                  d={`M ${room.cx - 35} ${room.cy + 45} L ${room.cx + 35} ${room.cy + 45} L ${room.cx + 35} ${room.cy - 10} A 35 35 0 0 0 ${room.cx - 35} ${room.cy - 10} Z`}
                  className={`fill-[#0f172a] stroke-[3px] transition-colors duration-200 ${strokeColor}`}
                  filter="url(#deepShadow)"
                />

                <path
                  d={`M ${room.cx - 25} ${room.cy + 35} L ${room.cx + 25} ${room.cy + 35} L ${room.cx + 25} ${room.cy - 5} A 25 25 0 0 0 ${room.cx - 25} ${room.cy - 5} Z`}
                  fill={
                    count > 0 || isCommander || isTrap ? glowColor : "#020617"
                  }
                  className="group-hover:brightness-125 transition-all duration-200"
                  filter={
                    count > 0 || isCommander || isTrap ? "url(#neonGlow)" : ""
                  }
                />

                <line
                  x1={room.cx - 25}
                  y1={room.cy + 15}
                  x2={room.cx + 25}
                  y2={room.cy + 15}
                  stroke="#020617"
                  strokeWidth="3"
                  opacity="0.7"
                />
                <line
                  x1={room.cx}
                  y1={room.cy - 30}
                  x2={room.cx}
                  y2={room.cy + 35}
                  stroke="#020617"
                  strokeWidth="3"
                  opacity="0.7"
                />

                <foreignObject
                  x={room.cx - 60}
                  y={room.cy - 60}
                  width="120"
                  height="120"
                  className="pointer-events-none"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center relative overflow-visible">
                    {isCommander ? (
                      <Crown
                        className="text-amber-400 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12"
                        strokeWidth={2.5}
                      />
                    ) : isTrap ? (
                      <Bomb
                        className="text-purple-400 drop-shadow-[0_2px_0_#000] z-40 w-12 h-12"
                        strokeWidth={2.5}
                      />
                    ) : count > 0 ? (
                      <span
                        className={`font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-4xl text-white`}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="font-black z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-2xl text-slate-400 opacity-50">
                        {room.id + 1}
                      </span>
                    )}

                    {isActive && (
                      <Crosshair
                        className="absolute text-amber-400 drop-shadow-[0_2px_0_#000] animate-spin-slow opacity-90 z-10 w-16 h-16"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <main
      className={`min-h-[100dvh] relative flex flex-col items-center p-4 ${cairo.className} bg-slate-50 dark:bg-[#0f172a] transition-colors duration-500`}
      dir="rtl"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scroll::-webkit-scrollbar { width: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 20px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); }
        @keyframes floatGameExtra { 0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); } 25% { transform: translate(-20px, 15px) rotate(8deg) scale(1.05); } 50% { transform: translate(-10px, -15px) rotate(-8deg) scale(0.95); } 75% { transform: translate(15px, 20px) rotate(5deg) scale(1.02); } }
        .animate-float-game-extra { animation: floatGameExtra ease-in-out infinite; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `,
        }}
      />

      <SolidGamingBackground />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 left-6 z-[60] p-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:translate-y-1 transition-all shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4"
        title={isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
      >
        {isDarkMode ? (
          <Sun size={20} strokeWidth={2.5} />
        ) : (
          <Moon size={20} strokeWidth={2.5} />
        )}
      </button>

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col h-full py-4">
        {/* ===================== شاشة إدخال الكود ===================== */}
        {step === "enterCode" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-8 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in-95 my-auto text-center transition-colors">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-[2rem] mx-auto flex items-center justify-center mb-6 border-4 border-indigo-300 dark:border-indigo-700 shadow-inner">
              <Lock size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
              الوصول للغرفة
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8">
              أدخل الكود السري المكون من 5 رموز
            </p>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="C-XXXX"
              className="w-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-2xl p-5 text-center text-4xl font-black tracking-[0.4em] uppercase outline-none transition-colors mb-6 shadow-inner text-slate-900 dark:text-white placeholder:tracking-normal placeholder:text-lg"
              dir="ltr"
            />

            <button
              onClick={handleEnterRoom}
              disabled={roomCode.length !== 5 || isCheckingCode}
              className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-300 disabled:border-slate-400 disabled:translate-y-1.5 disabled:border-b-4 text-slate-900 dark:text-white rounded-2xl font-black text-xl active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] transition-all flex items-center justify-center gap-2 border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4"
            >
              {isCheckingCode ? "جاري التحقق..." : "دخول غرفة العمليات"}{" "}
              <ChevronRight size={24} strokeWidth={3} />
            </button>
          </div>
        )}

        {/* ===================== شاشة اختيار الفريق ===================== */}
        {step === "selectTeam" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-8 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in-95 my-auto text-center transition-colors">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[2rem] mx-auto flex items-center justify-center mb-6 border-4 border-slate-300 dark:border-slate-700 shadow-inner">
              <Swords size={48} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              اختر ولاءك
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-8 flex items-center justify-center gap-2">
              كود الغرفة:{" "}
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                {roomCode}
              </span>
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  if (team1Ready) return;
                  setSelectedTeam(1);
                  setStep("setup");
                }}
                disabled={team1Ready}
                className={
                  team1Ready
                    ? "w-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl p-5 font-black text-xl flex items-center gap-4 cursor-not-allowed"
                    : "w-full group bg-white dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-slate-800 border-4 border-slate-900 dark:border-black text-cyan-600 dark:text-cyan-400 rounded-2xl p-5 font-black text-xl flex items-center gap-4 transition-all active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4"
                }
              >
                <div
                  className={
                    team1Ready
                      ? "w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center"
                      : "w-14 h-14 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 border-4 border-cyan-300 dark:border-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform"
                  }
                >
                  {team1Ready ? (
                    <Lock size={24} strokeWidth={3} />
                  ) : (
                    <User size={24} strokeWidth={3} />
                  )}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team1Name}</span>
                  {team1Ready && (
                    <span className="text-sm font-bold text-rose-500 border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg mt-1 sm:mt-0 w-fit">
                      (مُعتمد ومقفل)
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => {
                  if (team2Ready) return;
                  setSelectedTeam(2);
                  setStep("setup");
                }}
                disabled={team2Ready}
                className={
                  team2Ready
                    ? "w-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl p-5 font-black text-xl flex items-center gap-4 cursor-not-allowed"
                    : "w-full group bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-slate-800 border-4 border-slate-900 dark:border-black text-rose-600 dark:text-rose-400 rounded-2xl p-5 font-black text-xl flex items-center gap-4 transition-all active:translate-y-1.5 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] border-b-8 active:border-b-4"
                }
              >
                <div
                  className={
                    team2Ready
                      ? "w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex items-center justify-center"
                      : "w-14 h-14 rounded-xl bg-rose-100 dark:bg-rose-900/40 border-4 border-rose-300 dark:border-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform"
                  }
                >
                  {team2Ready ? (
                    <Lock size={24} strokeWidth={3} />
                  ) : (
                    <User size={24} strokeWidth={3} />
                  )}
                </div>
                <span className="flex-1 text-right flex flex-col sm:flex-row sm:items-center justify-between">
                  <span>{team2Name}</span>
                  {team2Ready && (
                    <span className="text-sm font-bold text-rose-500 border-2 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg mt-1 sm:mt-0 w-fit">
                      (مُعتمد ومقفل)
                    </span>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== شاشة توزيع الجنود (Setup) ===================== */}
        {step === "setup" && selectedTeam && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-10 duration-500 w-full h-full bg-white dark:bg-slate-800 rounded-3xl border-4 border-slate-900 dark:border-black shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] overflow-hidden">
            {/* الهيدر */}
            <div
              className={`bg-slate-50 dark:bg-slate-900 border-b-4 border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shrink-0 transition-colors`}
            >
              <div>
                <h2 className={`text-xl font-black ${theme.text}`}>
                  قيادة جيش {selectedTeam === 1 ? team1Name : team2Name}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs mt-1">
                  حدد النافذة لتوزيع جيشك
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800 border-2 border-rose-300 dark:border-rose-600 border-b-4 text-rose-700 dark:text-rose-400 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:translate-y-0.5 active:border-b-2 transition-all shadow-sm"
                >
                  <RefreshCw size={16} strokeWidth={2.5} /> تصفير
                </button>
                <button
                  onClick={handleAutoDistribute}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 border-b-4 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 active:translate-y-0.5 active:border-b-2 transition-all shadow-sm"
                >
                  <Shuffle size={16} strokeWidth={2.5} /> عشوائي ذكي
                </button>
              </div>
            </div>

            {/* عداد الجنود */}
            <div
              className={`${theme.lightBg} border-b-4 border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-inner shrink-0`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-slate-900 dark:border-black shadow-sm ${selectedTeam === 1 ? "bg-cyan-100 text-cyan-600" : "bg-rose-100 text-rose-600"}`}
                >
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  الجنود المتبقين للتوزيع:
                </span>
              </div>
              <div
                className={`font-black text-3xl font-mono px-4 py-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-inner ${remainingSoldiers === 0 ? "text-emerald-500" : "text-amber-500"} transition-colors`}
              >
                {remainingSoldiers}
              </div>
            </div>

            {/* الخريطة التفاعلية */}
            <div
              className={`flex-1 relative flex flex-col items-center justify-start p-4 overflow-y-auto overflow-x-hidden custom-scroll bg-slate-50 dark:bg-[#0f172a]`}
            >
              {renderInteractiveCastle()}
            </div>

            {/* لوحة التحكم السفلية */}
            <div
              className={`bg-white dark:bg-slate-800 border-t-4 border-slate-200 dark:border-slate-700 p-5 z-30 shrink-0 min-h-[160px] flex flex-col justify-center rounded-b-[1.5rem]`}
            >
              {activeRoomIdx !== null ? (
                <div className="animate-in slide-in-from-bottom-5">
                  <div className="flex justify-between items-center mb-4 border-b-2 border-slate-100 dark:border-slate-700 pb-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <MapPin size={20} className={`${theme.text}`} /> تعديل
                      النافذة رقم {activeRoomIdx + 1}
                    </h3>
                    <button
                      onClick={() => setActiveRoomIdx(null)}
                      className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 border-2 border-rose-200 dark:border-rose-800 border-b-4 active:border-b-2 active:translate-y-0.5 font-black text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      إغلاق ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shadow-inner">
                      <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-3">
                        تعديل الجنود
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRoomChange(activeRoomIdx, -1)}
                          disabled={
                            rooms[activeRoomIdx] === 0 ||
                            commanderRoom === activeRoomIdx ||
                            trapRoom === activeRoomIdx
                          }
                          className="w-12 h-12 shrink-0 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 disabled:opacity-30 disabled:border-b-2 flex items-center justify-center active:translate-y-0.5 border-2 border-rose-300 dark:border-rose-800 border-b-4 active:border-b-2 transition-all"
                        >
                          <Minus size={24} strokeWidth={3} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={rooms[activeRoomIdx] || ""}
                          onChange={(e) =>
                            handleManualInput(activeRoomIdx, e.target.value)
                          }
                          disabled={
                            commanderRoom === activeRoomIdx ||
                            trapRoom === activeRoomIdx
                          }
                          className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 w-16 h-12 rounded-xl flex items-center justify-center text-center font-black text-2xl text-slate-900 dark:text-white font-mono shadow-inner outline-none focus:border-indigo-500 disabled:opacity-50"
                        />

                        <button
                          onClick={() => handleRoomChange(activeRoomIdx, 1)}
                          disabled={
                            remainingSoldiers === 0 ||
                            commanderRoom === activeRoomIdx ||
                            trapRoom === activeRoomIdx
                          }
                          className="w-12 h-12 shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 disabled:opacity-30 disabled:border-b-2 flex items-center justify-center active:translate-y-0.5 border-2 border-emerald-300 dark:border-emerald-800 border-b-4 active:border-b-2 transition-all"
                        >
                          <Plus size={24} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() =>
                          assignSpecialRole(activeRoomIdx, "commander")
                        }
                        className={`w-full h-full rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all border-2 border-b-4 active:border-b-2 active:translate-y-0.5 ${commanderRoom === activeRoomIdx ? "bg-amber-400 text-slate-900 border-amber-600" : "bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-500 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800"}`}
                      >
                        <Crown size={20} strokeWidth={2.5} />{" "}
                        <span className="hidden sm:inline">
                          {commanderRoom === activeRoomIdx
                            ? "غرفة القائد"
                            : "تعيين كقائد"}
                        </span>{" "}
                        <span className="sm:hidden">قائد</span>
                      </button>
                      <button
                        onClick={() => assignSpecialRole(activeRoomIdx, "trap")}
                        className={`w-full h-full rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all border-2 border-b-4 active:border-b-2 active:translate-y-0.5 ${trapRoom === activeRoomIdx ? "bg-purple-500 text-white border-purple-700" : "bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-800"}`}
                      >
                        <Bomb size={20} strokeWidth={2.5} />{" "}
                        <span className="hidden sm:inline">
                          {trapRoom === activeRoomIdx
                            ? "غرفة الفخ"
                            : "تعيين كفخ"}
                        </span>{" "}
                        <span className="sm:hidden">فخ</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in flex flex-col justify-center h-full">
                  {!isSetupValid && (
                    <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-800 mb-4 text-xs font-black shadow-sm">
                      <AlertCircle
                        size={24}
                        className="shrink-0"
                        strokeWidth={2.5}
                      />
                      <p className="leading-relaxed">
                        وزع الـ {TOTAL_SOLDIERS} جندي بالكامل، وعين القائد والفخ
                        في غرفتين مختلفتين لاعتماد الخطة.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={submitData}
                    disabled={!isSetupValid || isSubmitting}
                    className={`w-full py-5 rounded-2xl text-xl font-black flex items-center justify-center gap-3 transition-all border-4 shadow-[4px_4px_0px_#0f172a] dark:shadow-[4px_4px_0px_#000] ${isSetupValid ? `${theme.btn} border-slate-900 dark:border-black text-white border-b-8 active:border-b-4 active:translate-y-1 animate-pulse` : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-300 dark:border-slate-700 border-b-4"}`}
                  >
                    {isSubmitting ? (
                      "جاري الإرسال للقيادة..."
                    ) : isSetupValid ? (
                      <>
                        اعتماد الخطة <CheckCircle2 size={24} strokeWidth={3} />
                      </>
                    ) : (
                      "أكمل التجهيزات أولاً"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== شاشة الانتظار (Done) والانتقال للمشاهدة ===================== */}
        {step === "done" && (
          <div className="bg-white dark:bg-slate-800 border-4 border-slate-900 dark:border-black rounded-3xl p-10 shadow-[8px_8px_0px_#0f172a] dark:shadow-[8px_8px_0px_#000] animate-in zoom-in text-center my-auto w-full">
            <div className="w-32 h-32 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-8 border-4 border-emerald-300 dark:border-emerald-700 shadow-inner animate-bounce">
              <CheckCircle2 size={64} strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
              تم اعتماد الخطة!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-lg leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-inner">
              تم إرسال توزيع جيشك النهائي لشاشة الحكم بسرية تامة. يمكنك الآن
              الانتقال لمشاهدة المعركة الحية من جوالك.
            </p>

            <button
              onClick={() =>
                (window.location.href = `/games/castle-war/display?code=${roomCode}`)
              }
              className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xl rounded-2xl border-4 border-slate-900 dark:border-black border-b-8 active:border-b-4 active:translate-y-1 shadow-[4px_4px_0px_#0f172a] transition-all flex items-center justify-center gap-3"
            >
              الانتقال لشاشة المعركة 📺{" "}
              <MonitorPlay size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
