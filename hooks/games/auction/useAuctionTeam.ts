"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { serverNow, startCountdown, useServerClock } from "@/lib/game/server-clock";
import { startBackupRead, type BackupRead } from "@/lib/game/room-backup-read";
import { postAuction, readAuctionTeamToken, saveAuctionTeamToken } from "@/lib/game/auction-client";

/** صف الغرفة (من البث أو القراءة): الحقول اللي نقراها هنا، والباقي ينضاف لبيانات اللعبة مثل ما هو */
type AuctionRoomRow = {
  t1_name: string;
  t2_name: string;
  t1_device_id?: string | null;
  t2_device_id?: string | null;
  game_state?: string;
} & Record<string, unknown>;


export function useAuctionTeam() {
  const supabase = getSupabaseBrowser();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);

  const [roomCode, setRoomCode] = useState("");
  const [teamId, setTeamId] = useState<1 | 2 | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [myBid, setMyBid] = useState<number | "">("");

  const [roomInfo, setRoomInfo] = useState<{ t1_name: string, t2_name: string, t1_device_id?: string | null, t2_device_id?: string | null } | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

  // قناة وحدة للغرفة تخدم الحالتين (قبل الدخول وبعده): كان فيه قناتين على نفس الجدول فكل تحديث يوصل الجوال مرتين
  const joinedRef = useRef(false);
  const backupRef = useRef<BackupRead | null>(null);
  useEffect(() => {
    joinedRef.current = isJoined;
  }, [isJoined]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("room");
      if (r) setRoomCode(r.toUpperCase());

      let dId = sessionStorage.getItem("auction_device_id");
      if (!dId) {
        dId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("auction_device_id", dId);
      }
      setDeviceId(dId);
    }
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    if (roomCode.length === 5) {
      const fetchNames = async () => {
        const { data } = await supabase.from("auction_rooms").select("t1_name, t2_name, t1_device_id, t2_device_id").eq("room_code", roomCode).neq("t1_name", Date.now().toString()).single();
        if (data) {
          setRoomInfo(data);
          let dId = sessionStorage.getItem("auction_device_id");
          if (dId) {
            if (data.t1_device_id === dId) {
              setTeamId(1);
              setIsJoined(true);
            } else if (data.t2_device_id === dId) {
              setTeamId(2);
              setIsJoined(true);
            }
          }
        } else {
          setRoomInfo(null);
        }
      };
      fetchNames();

      // تحديث الغرفة (من البث أو من القراءة الاحتياطية): الأسماء، ومين ماسك الفريق، وبيانات اللعبة لو داخل
      const applyRoom = (row: AuctionRoomRow) => {
        setRoomInfo({
          t1_name: row.t1_name, t2_name: row.t2_name,
          t1_device_id: row.t1_device_id, t2_device_id: row.t2_device_id
        });

        let dId = sessionStorage.getItem("auction_device_id");
        if (dId) {
          if (row.t1_device_id === dId) {
            setTeamId(1);
            setIsJoined(true);
          } else if (row.t2_device_id === dId) {
            setTeamId(2);
            setIsJoined(true);
          } else if (row.t1_device_id !== dId && row.t2_device_id !== dId) {
            setIsJoined(false);
            setTeamId(null);
          }
        }

        // داخل اللعبة: نفس التحديث يحدّث بياناتها (بدل قناة ثانية تستقبله مرة ثانية)
        if (!joinedRef.current) return;
        setLiveData((prev: any) => {
          const newData = { ...prev, ...row };
          if (row.game_state === "bidding" && prev?.game_state !== "bidding") {
            setMyBid("");
          }
          return newData;
        });
      };

      // القراءة الاحتياطية (داخل اللعبة بس): الجوال اللي فاته تحديث بالبث يلحق لحاله، بدون تحديث الصفحة
      let lastRow = "";
      const backup = startBackupRead(async ({ signal, isFresh }) => {
        if (!joinedRef.current) return;
        const { data } = await supabase.from("auction_rooms").select("*").eq("room_code", roomCode).abortSignal(signal).maybeSingle();
        if (!data || !isFresh()) return;
        const json = JSON.stringify(data);
        if (json === lastRow) return;
        lastRow = json;
        applyRoom(data);
      });
      backupRef.current = backup;

      const nameChannel = supabase.channel('names_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
          backup.onEvent();
          lastRow = JSON.stringify(payload.new);
          applyRoom(payload.new as AuctionRoomRow);
        }).subscribe((status) => backup.onStatus(status));

      return () => {
        if (backupRef.current === backup) backupRef.current = null;
        backup.stop();
        supabase.removeChannel(nameChannel);
      };
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!isJoined || !roomCode) return;

    const fetchInitialData = async () => {
      const { data } = await supabase.from("auction_rooms").select("*").eq("room_code", roomCode).neq("t1_name", Date.now().toString()).single();
      if (data) {
        setLiveData((prev: any) => {
          if (data.game_state === "bidding" && prev?.game_state !== "bidding") {
            setMyBid("");
          }
          return data;
        });
      } else {
        triggerAlert("رمز الغرفة غير صحيح أو أن اللعبة لم تبدأ بعد.");
        setIsJoined(false);
      }
    };
    fetchInitialData();

    // التحديثات اللحظية تجي من قناة الغرفة فوق (names_sync)، والرجوع للتبويب وانقطاع البث والفحص الدوري
    // من القراءة الاحتياطية هناك
  }, [isJoined, roomCode]);

  // المؤقت: الحكم يكتب وقت الانتهاء مرة وحدة مع البداية، والجوال يعد منه (لفوق، مثل الحكم بالضبط).
  // العد على ساعة السيرفر، مو ساعة الجوال (لو مقدّمة أو متأخرة). وهو واقف (أو قبل ملف القاعدة 0017): الرقم المحفوظ
  useServerClock();
  const timerEndsAt = liveData?.is_timer_running && liveData?.timer_ends_at ? Date.parse(liveData.timer_ends_at) : null;
  // الرقم مربوط بوقت الانتهاء اللي انحسب له (ويتغير بلحظته بالضبط). أول لحظة بعد البداية أو بعد تحديث الصفحة
  // (قبل أول دقة) نحسب من ساعة السيرفر مباشرة، بدل رقم قديم من قبل البداية (كان يطلع رقم غلط لحظة)
  const [tick, setTick] = useState<{ end: number | null; left: number }>({ end: null, left: 0 });
  useEffect(() => {
    if (timerEndsAt === null) return;
    return startCountdown(timerEndsAt, (left) => setTick({ end: timerEndsAt, left }));
  }, [timerEndsAt]);
  // وصل صفر وما جا تحديث من البث خلال ثانيتين: الجوال يقرا الغرفة على طول
  useEffect(() => {
    backupRef.current?.watchDeadline(isJoined ? timerEndsAt : null);
  }, [timerEndsAt, isJoined]);
  const timerLeft: number =
    timerEndsAt === null
      ? liveData?.timer || 0
      : tick.end === timerEndsAt
        ? tick.left
        : Math.max(0, Math.ceil((timerEndsAt - serverNow()) / 1000));

  const handleJoin = async () => {
    if (!roomCode || roomCode.length !== 5 || !teamId || !deviceId) return;

    // السيرفر يحجز الفريق (نفس الشروط: الغرفة موجودة وما انتهت، والفريق فاضي أو هو أصلاً معي)
    // ويعطيني token مربوط بالغرفة والفريق والجهاز، ينرسل مع كل مزايدة
    const res = await postAuction<{ token: string }>("team-join", {
      roomCode,
      team: teamId,
      deviceId,
      token: readAuctionTeamToken(roomCode, teamId),
    });

    if (!res.success || !res.data) {
      triggerAlert(res.success ? "تعذّر الاتصال، حاول مرة ثانية." : res.error);
      return;
    }

    saveAuctionTeamToken(roomCode, teamId, res.data.token);
    setIsJoined(true);
  };

  const handleLeave = () => {
    setIsJoined(false);
    setTeamId(null);
    setLiveData(null);
  };

  const handleSendBid = async () => {
    if (myBid === "" || Number(myBid) <= 0) { triggerAlert("الرجاء إدخال مبلغ مزايدة صحيح."); return; }
    if (Number(myBid) % 100 !== 0) { triggerAlert("يجب أن تكون المزايدة من مضاعفات 100."); return; }

    const oppBalance = teamId === 1 ? liveData.t2_balance : liveData.t1_balance;
    const myBalance = teamId === 1 ? liveData.t1_balance : liveData.t2_balance;
    const remainingQs = liveData.questions.length - liveData.current_index;

    let minBid = 1000;
    if (oppBalance <= 0 && remainingQs > 0) {
      const calculated = Math.floor(myBalance / remainingQs);
      minBid = Math.max(100, Math.floor(calculated / 100) * 100);
    }

    if (Number(myBid) < minBid) {
      triggerAlert(`عفواً، أقل مبلغ مسموح للمزايدة هو ${minBid} 💰`);
      return;
    }

    if (Number(myBid) > myBalance) { triggerAlert("لا يمكنك المزايدة بأكثر من رصيدك الحالي."); return; }

    if (!teamId) return;

    // السيرفر يكتب عمود مزايدة فريقي بس، وبشرط إني للحين ماسك الفريق (الـ token) ووقت المزايدة
    const res = await postAuction("team-bid", {
      roomCode,
      team: teamId,
      deviceId,
      token: readAuctionTeamToken(roomCode, teamId),
      bid: Number(myBid),
    });

    if (!res.success) {
      triggerAlert(res.error);
      if (res.code === "lost") handleLeave();
      return;
    }

    triggerAlert("تم إرسال مزايدتك للحكم بنجاح! 🚀");
  };

  const myName = liveData ? (teamId === 1 ? liveData.t1_name : liveData.t2_name) : "";
  const myBalance = liveData ? ((teamId === 1 ? liveData.t1_balance : liveData.t2_balance) || 0) : 0;
  const myPoints = liveData ? ((teamId === 1 ? liveData.t1_points : liveData.t2_points) || 0) : 0;
  const myAmbush = liveData ? ((teamId === 1 ? liveData.t1_ambush : liveData.t2_ambush) ?? 3) : 3;
  const mySellCards = liveData ? ((teamId === 1 ? liveData.t1_sell_cards : liveData.t2_sell_cards) ?? 3) : 3;
  const activeQuestion = liveData && liveData.questions && liveData.current_index !== undefined ? liveData.questions[liveData.current_index] : null;

  return {
    mounted, isDark, setIsDark, roomCode, setRoomCode, teamId, setTeamId, isJoined,
    liveData, timerLeft, myBid, setMyBid, roomInfo, alertConfig, deviceId,
    triggerAlert, closeAlert, handleJoin, handleLeave, handleSendBid,
    myName, myBalance, myPoints, myAmbush, mySellCards, activeQuestion
  };
}