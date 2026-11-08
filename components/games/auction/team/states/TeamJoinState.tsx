"use client";
import React from "react";
import { Wallet, UserCheck, Lock } from "lucide-react";

export default function TeamJoinState({ ctx }: { ctx: any }) {
  if (ctx.isJoined) return null;

  const isT1Full = ctx.roomInfo?.t1_device_id && ctx.roomInfo.t1_device_id !== ctx.deviceId;
  const isT2Full = ctx.roomInfo?.t2_device_id && ctx.roomInfo.t2_device_id !== ctx.deviceId;

  return (
    <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-4 border-yellow-500 text-center w-full max-w-md animate-in zoom-in-95 mx-auto mt-[10vh]">
      <Wallet className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
      <h1 className="text-3xl font-black mb-2 text-slate-800 dark:text-white">دخول الفرق</h1>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">المزاد - شاشة اللاعبين</p>

      <div className="space-y-6 text-right">
        <div>
          <label className="block text-xs font-black text-slate-500 mb-2">كود الغرفة</label>
          <input type="text" maxLength={5} placeholder="أدخل كود الحكم" value={ctx.roomCode} onChange={e => ctx.setRoomCode(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-black text-center text-xl tracking-widest focus:border-yellow-500 outline-none transition-colors uppercase" />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 mb-2">اختر فريقك</label>
          <div className="flex gap-3">
            <button 
              disabled={isT1Full}
              onClick={() => ctx.setTeamId(1)} 
              className={`flex-1 py-4 rounded-xl border-b-4 font-black transition-all flex flex-col items-center justify-center gap-1 ${isT1Full ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 opacity-60 cursor-not-allowed" : ctx.teamId === 1 ? "bg-cyan-600 border-cyan-800 text-white translate-y-[4px] border-b-0" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
            >
              {isT1Full ? <Lock size={20} className="text-red-500" /> : <UserCheck size={20} />}
              <span className="truncate w-full px-2">{ctx.roomInfo ? ctx.roomInfo.t1_name : "الفريق الأول"}</span>
              {isT1Full && <span className="text-[10px] text-red-500 font-bold bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full mt-1">ممتلئ</span>}
            </button>
            <button 
              disabled={isT2Full}
              onClick={() => ctx.setTeamId(2)} 
              className={`flex-1 py-4 rounded-xl border-b-4 font-black transition-all flex flex-col items-center justify-center gap-1 ${isT2Full ? "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 opacity-60 cursor-not-allowed" : ctx.teamId === 2 ? "bg-rose-600 border-rose-800 text-white translate-y-[4px] border-b-0" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
            >
              {isT2Full ? <Lock size={20} className="text-red-500" /> : <UserCheck size={20} />}
              <span className="truncate w-full px-2">{ctx.roomInfo ? ctx.roomInfo.t2_name : "الفريق الثاني"}</span>
              {isT2Full && <span className="text-[10px] text-red-500 font-bold bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full mt-1">ممتلئ</span>}
            </button>
          </div>
        </div>
      </div>

      <button 
        disabled={(ctx.teamId === 1 && isT1Full) || (ctx.teamId === 2 && isT2Full)}
        onClick={ctx.handleJoin} 
        className={`w-full mt-8 py-4 font-black text-xl rounded-xl border-b-4 transition-all shadow-md flex items-center justify-center gap-2 ${
          (ctx.teamId === 1 && isT1Full) || (ctx.teamId === 2 && isT2Full)
            ? "bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-80"
            : "bg-yellow-500 hover:bg-yellow-400 text-slate-900 border-yellow-700 active:border-b-0 active:translate-y-[4px]"
        }`}
      >
        {((ctx.teamId === 1 && isT1Full) || (ctx.teamId === 2 && isT2Full)) ? <Lock size={24} /> : null}
        دخول للعبة
      </button>
    </div>
  );
}