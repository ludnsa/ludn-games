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
  
  const [roomInfo, setRoomInfo] = useState<{t1_name: string, t2_name: string, t1_device_id?: string | null, t2_device_id?: string | null} | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  
  const triggerAlert = (msg: string) => setAlertConfig({ show: true, message: msg });
  const closeAlert = () => setAlertConfig({ show: false, message: "" });

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
        if (data) setRoomInfo(data);
        else setRoomInfo(null);
      };
      fetchNames();

      const nameChannel = supabase.channel('names_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
           setRoomInfo({ 
             t1_name: payload.new.t1_name, t2_name: payload.new.t2_name,
             t1_device_id: payload.new.t1_device_id, t2_device_id: payload.new.t2_device_id
           });
        }).subscribe();

      return () => { supabase.removeChannel(nameChannel); };
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
    if (!roomCode || roomCode.length !== 5 || !teamId || !deviceId) return;

    const colName = teamId === 1 ? "t1_device_id" : "t2_device_id";

    // 1. Check if we already own the team (e.g. refreshed the page)
    const { data: currentRoom } = await supabase.from("auction_rooms").select(colName).eq("room_code", roomCode).neq("t1_name", Date.now().toString()).single();
    
    if (!currentRoom) {
      triggerAlert("رمز الغرفة غير صحيح أو اللعبة غير موجودة.");
      return;
    }

    if ((currentRoom as any)[colName] === deviceId) {
      setIsJoined(true);
      return;
    }

    // 2. Try to claim the team ATOMICALLY (Compare-and-Swap). Only works if it is currently NULL!
    const { data: updateData } = await supabase
      .from("auction_rooms")
      .update({ [colName]: deviceId })
      .eq("room_code", roomCode)
      .is(colName, null)
      .select();

    if (!updateData || updateData.length === 0) {
      triggerAlert("عذراً، هذا الفريق ممتلئ! لقد دخل قائد آخر مسبقاً.");
      return;
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
    
    const colName = teamId === 1 ? "t1_bid" : "t2_bid";
    const deviceIdCol = teamId === 1 ? "t1_device_id" : "t2_device_id";

    // ATOMIC BID: Only allow update if the database still registers THIS device as the leader!
    const { data: updateData } = await supabase
      .from("auction_rooms")
      .update({ [colName]: Number(myBid) })
      .eq("room_code", roomCode)
      .eq(deviceIdCol, deviceId) // Critical Security Check
      .select();

    if (!updateData || updateData.length === 0) {
      triggerAlert("عذراً! لقد تم تسجيل دخول قائد آخر لهذا الفريق وتم سحب الصلاحية منك.");
      handleLeave();
      return;
    }

    triggerAlert("تم إرسال مزايدتك للحكم بنجاح! 🚀");
  };

  const myName = liveData ? (teamId === 1 ? liveData.t1_name : liveData.t2_name) : "";
  const myBalance = liveData ? ((teamId === 1 ? liveData.t1_balance : liveData.t2_balance) || 0) : 0;
  const myPoints = liveData ? ((teamId === 1 ? liveData.t1_points : liveData.t2_points) || 0) : 0;
  const myAmbush = liveData ? ((teamId === 1 ? liveData.t1_ambush : liveData.t2_ambush) ?? 3) : 3;
  const activeQuestion = liveData && liveData.questions && liveData.current_index !== undefined ? liveData.questions[liveData.current_index] : null;

  return {
    mounted, isDark, setIsDark, roomCode, setRoomCode, teamId, setTeamId, isJoined,
    liveData, myBid, setMyBid, roomInfo, alertConfig, deviceId,
    triggerAlert, closeAlert, handleJoin, handleLeave, handleSendBid,
    myName, myBalance, myPoints, myAmbush, activeQuestion
  };
}