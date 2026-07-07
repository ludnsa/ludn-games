"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";


export function useAuctionTeam() {
  const supabase = getSupabaseBrowser();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(true);
  
  const [roomCode, setRoomCode] = useState("");
  const [teamId, setTeamId] = useState<1 | 2 | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [myBid, setMyBid] = useState<number | "">("");
  
  const [roomInfo, setRoomInfo] = useState<{t1_name: string, t2_name: string} | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  
  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("room");
      if (r) setRoomCode(r.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    if (roomCode.length === 5) {
      const fetchNames = async () => {
        const { data } = await supabase.from("auction_rooms").select("t1_name, t2_name").eq("room_code", roomCode).single();
        if (data) setRoomInfo(data);
        else setRoomInfo(null);
      };
      fetchNames();

      const nameChannel = supabase.channel('names_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
           setRoomInfo({ t1_name: payload.new.t1_name, t2_name: payload.new.t2_name });
        }).subscribe();

      return () => { supabase.removeChannel(nameChannel); };
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!isJoined || !roomCode) return;

    const fetchInitialData = async () => {
      const { data } = await supabase.from("auction_rooms").select("*").eq("room_code", roomCode).neq("t1_balance", -Date.now()).single();
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

    // Fetch data when user returns to the tab (fixes mobile sleep without continuous polling)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInitialData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const channel = supabase.channel('team_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setLiveData((prev: any) => {
          const newData = { ...prev, ...payload.new };
          if (payload.new.game_state === "bidding" && prev?.game_state !== "bidding") {
             setMyBid("");
          }
          return newData;
        });
      })
      .subscribe();

    return () => { 
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel); 
    };
  }, [isJoined, roomCode]);

  const handleJoin = async () => {
    if (roomCode.length !== 5) { triggerAlert("الرجاء إدخال كود غرفة مكون من 5 أحرف."); return; }
    if (!teamId) { triggerAlert("الرجاء اختيار فريقك أولاً."); return; }
    
    let deviceId = localStorage.getItem("auction_device_id");
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("auction_device_id", deviceId);
    }

    const { data: roomData, error: fetchError } = await supabase
      .from("auction_rooms")
      .select("t1_device_id, t2_device_id")
      .eq("room_code", roomCode)
      .neq("t1_balance", -Date.now()) // CACHE BUSTER
      .single();

    if (fetchError || !roomData) {
      triggerAlert("رمز الغرفة غير صحيح أو اللعبة غير موجودة.");
      return;
    }

    const colName = teamId === 1 ? "t1_device_id" : "t2_device_id";
    const currentDeviceId = roomData[colName as keyof typeof roomData];

    if (currentDeviceId && currentDeviceId !== deviceId) {
      triggerAlert("عذراً، هذا الفريق ممتلئ! لقد دخل قائد آخر مسبقاً.");
      return;
    }

    if (currentDeviceId !== deviceId) {
      const { error: updateError } = await supabase
        .from("auction_rooms")
        .update({ [colName]: deviceId })
        .eq("room_code", roomCode);

      if (updateError) {
        triggerAlert("حدث خطأ أثناء الانضمام للفريق.");
        return;
      }
    }

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
    
    if (Number(myBid) < 1000) { 
      triggerAlert("عفواً، أقل مبلغ مسموح للمزايدة هو 1000 💰"); 
      return; 
    }
    
    const myBalance = teamId === 1 ? liveData.t1_balance : liveData.t2_balance;
    if (Number(myBid) > myBalance) { triggerAlert("لا يمكنك المزايدة بأكثر من رصيدك الحالي."); return; }
    
    // Strict Device ID check
    const { data: checkRoom } = await supabase
      .from("auction_rooms")
      .select("t1_device_id, t2_device_id")
      .eq("room_code", roomCode)
      .neq("t1_balance", -Date.now()) // CACHE BUSTER
      .single();
    if (checkRoom) {
      const requiredId = teamId === 1 ? checkRoom.t1_device_id : checkRoom.t2_device_id;
      const deviceId = localStorage.getItem("auction_device_id");
      if (requiredId && requiredId !== deviceId) {
        triggerAlert("عذراً! لقد تم تسجيل دخول قائد آخر لهذا الفريق.");
        handleLeave();
        return;
      }
    }

    const colName = teamId === 1 ? "t1_bid" : "t2_bid";
    await supabase.from("auction_rooms").update({ [colName]: Number(myBid) }).eq("room_code", roomCode);
    triggerAlert("تم إرسال مزايدتك للحكم بنجاح! 🚀");
  };

  const myName = liveData ? (teamId === 1 ? liveData.t1_name : liveData.t2_name) : "";
  const myBalance = liveData ? ((teamId === 1 ? liveData.t1_balance : liveData.t2_balance) || 0) : 0;
  const myPoints = liveData ? ((teamId === 1 ? liveData.t1_points : liveData.t2_points) || 0) : 0;
  const myAmbush = liveData ? ((teamId === 1 ? liveData.t1_ambush : liveData.t2_ambush) ?? 3) : 3;
  const activeQuestion = liveData && liveData.questions && liveData.current_index !== undefined ? liveData.questions[liveData.current_index] : null;

  return {
    mounted, isDark, setIsDark, roomCode, setRoomCode, teamId, setTeamId, isJoined,
    liveData, myBid, setMyBid, roomInfo, alertConfig,
    triggerAlert, closeAlert, handleJoin, handleLeave, handleSendBid,
    myName, myBalance, myPoints, myAmbush, activeQuestion
  };
}