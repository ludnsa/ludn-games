"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getQuizRoomPublicInfo, joinQuizRoom } from "@/actions/quiz-grid";
import type { QuizRoom, QuizSessionPlayer, QuizTeam } from "@/types";

const DEVICE_KEY = "quiz_player_device_id";

/**
 * شاشة اللاعب.
 *
 * تقرأ صف quiz_rooms فقط — وهو صف لا يحتوي على أي نص سؤال أو إجابة
 * (انظر supabase/migrations/0001_quiz_grid.sql). لذلك لا يمكن لجهاز اللاعب
 * رؤية الإجابات حتى لو فحص حمولة البث اللحظي.
 */
export function useQuizPlayer() {
  const supabase = getSupabaseBrowser();

  const [mounted, setMounted] = useState(false);
  const [deviceId, setDeviceId] = useState("");

  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [team, setTeam] = useState<QuizTeam | null>(null);

  const [me, setMe] = useState<QuizSessionPlayer | null>(null);
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [players, setPlayers] = useState<QuizSessionPlayer[]>([]);

  const [roomInfo, setRoomInfo] = useState<{ t1Name: string; t2Name: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // -------------------------------------------------------------------
  // الإقلاع: معرّف الجهاز + رمز الغرفة من الرابط
  // -------------------------------------------------------------------

  useEffect(() => {
    setMounted(true);

    let id = sessionStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(DEVICE_KEY, id);
    }
    setDeviceId(id);

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("room");
    if (fromUrl) setRoomCode(fromUrl.toUpperCase());
  }, []);

  // -------------------------------------------------------------------
  // التحقق من الغرفة واستئناف الجلسة السابقة لنفس الجهاز
  // -------------------------------------------------------------------

  const lookupRoom = useCallback(
    async (code: string, device: string) => {
      const res = await getQuizRoomPublicInfo(code, device);
      if (!res.success) {
        setRoomInfo(null);
        return false;
      }

      setRoomInfo({ t1Name: res.data.t1Name, t2Name: res.data.t2Name });
      if (res.data.player) {
        setMe(res.data.player);
        setDisplayName(res.data.player.display_name);
        setTeam(res.data.player.team);
      }
      return true;
    },
    []
  );

  useEffect(() => {
    if (!deviceId || roomCode.length !== 5) {
      setRoomInfo(null);
      return;
    }
    lookupRoom(roomCode, deviceId);
  }, [roomCode, deviceId, lookupRoom]);

  // -------------------------------------------------------------------
  // البث اللحظي بعد الانضمام
  // -------------------------------------------------------------------

  const fetchRoomRow = useCallback(async (code: string) => {
    const { data } = await supabase.from("quiz_rooms").select("*").eq("room_code", code).maybeSingle();
    if (data) setRoom(data as QuizRoom);

    const { data: roster } = await supabase
      .from("quiz_session_players")
      .select("*")
      .eq("room_code", code)
      .order("joined_at", { ascending: true });
    if (roster) setPlayers(roster as QuizSessionPlayer[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me || !roomCode) return;

    fetchRoomRow(roomCode);

    const channel = supabase
      .channel(`quiz_player_${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => setRoom((prev) => ({ ...(prev || {}), ...payload.new } as QuizRoom))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_session_players", filter: `room_code=eq.${roomCode}` },
        () => fetchRoomRow(roomCode)
      )
      .subscribe();

    // الهواتف تقطع الاتصال عند إطفاء الشاشة — نُحدّث عند العودة
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchRoomRow(roomCode);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, roomCode]);

  // -------------------------------------------------------------------
  // الانضمام
  // -------------------------------------------------------------------

  const join = async () => {
    setError("");

    if (roomCode.length !== 5) {
      setError("رمز الغرفة يتكوّن من 5 خانات.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("اكتب اسمك (حرفان على الأقل).");
      return;
    }
    if (!team) {
      setError("اختر فريقك.");
      return;
    }

    setIsJoining(true);
    const res = await joinQuizRoom({ roomCode, deviceId, displayName: displayName.trim(), team });
    setIsJoining(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setMe(res.data.player);
    setNotice("تم انضمامك! تابع الشاشة الكبيرة.");
  };

  const leave = () => {
    setMe(null);
    setRoom(null);
    setNotice("");
  };

  // -------------------------------------------------------------------
  // مشتقات العرض
  // -------------------------------------------------------------------

  const myTeamName = useMemo(() => {
    if (!me) return "";
    if (room) return me.team === 1 ? room.t1_name : room.t2_name;
    return me.team === 1 ? roomInfo?.t1Name ?? "" : roomInfo?.t2Name ?? "";
  }, [me, room, roomInfo]);

  const myScore = room ? (me?.team === 1 ? room.t1_score : room.t2_score) : 0;
  const isMyTurn = Boolean(room && me && room.turn === me.team);

  /** هل أنا اللاعب الذي وقع عليه "استريح"؟ */
  const isRestedOut = Boolean(room?.rest_target_player_id && me && room.rest_target_player_id === me.id);

  const restTargetName = useMemo(() => {
    if (!room?.rest_target_player_id) return null;
    return players.find((p) => p.id === room.rest_target_player_id)?.display_name ?? null;
  }, [room, players]);

  const teammates = useMemo(
    () => (me ? players.filter((p) => p.team === me.team) : []),
    [players, me]
  );

  return {
    mounted, deviceId,
    roomCode, setRoomCode,
    displayName, setDisplayName,
    team, setTeam,
    roomInfo, me, room, players, teammates,
    isJoining, error, notice, setNotice,
    myTeamName, myScore, isMyTurn, isRestedOut, restTargetName,
    join, leave,
  };
}
