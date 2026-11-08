"use client";
import React from "react";
import { ShieldAlert, Send } from "lucide-react";

export default function TeamBiddingState({ ctx }: { ctx: any }) {
  if (!ctx.liveData || ctx.liveData.game_state !== "bidding" || !ctx.activeQuestion) return null;

  return (
    <div className="bg-[#0e0a06]/85 backdrop-blur-sm p-6 md:p-10 rounded-[2rem] shadow-xl border-4 border-yellow-500 text-center w-full animate-in slide-in-from-bottom-8">
      <h3 className="text-sm font-black text-slate-500 dark:text-slate-400 mb-2">فئة السؤال القادم</h3>
      <h2 className="text-4xl md:text-6xl font-black mb-8 text-[#e8c766] drop-shadow-sm">{ctx.activeQuestion.category}</h2>
      
      <div className="bg-[#120c07] p-6 rounded-2xl mb-8 border-2 border-[#d4af37]/30 shadow-inner">
         {ctx.myBalance <= 0 ? (
           <div className="py-6">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-pulse" />
              <p className="font-black text-xl text-rose-600">رصيدك 0 💰</p>
              <p className="font-bold text-slate-500 mt-2">لا يمكنك المزايدة في هذه الجولة.</p>
           </div>
         ) : (
           <>
             <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-4 text-right">أدخل مبلغ المزايدة الخاصة بك:</label>
             <div className="flex flex-col sm:flex-row gap-3">
               <div className={`flex items-center bg-[#120c07] border-2 rounded-xl transition-colors overflow-hidden flex-1 ${ctx.teamId === 1 ? "border-cyan-300 focus-within:border-cyan-500" : "border-rose-300 focus-within:border-rose-500"}`}>
                 <button onClick={() => ctx.setMyBid((p:any) => (Number(p) || 0) + 100)} className={`px-4 py-4 font-black text-2xl transition-colors ${ctx.teamId === 1 ? "text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30" : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"}`}>+</button>
                 <input 
                   type="number" 
                   placeholder="مثال: 1500"
                   value={ctx.myBid} 
                   onChange={e => ctx.setMyBid(e.target.value === "" ? "" : Number(e.target.value))} 
                   step={100}
                   className="w-full text-center bg-transparent font-black outline-none text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                 />
                 <button onClick={() => ctx.setMyBid((p:any) => Math.max(0, (Number(p) || 0) - 100))} className={`px-4 py-4 font-black text-2xl transition-colors ${ctx.teamId === 1 ? "text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30" : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"}`}>-</button>
               </div>
               <button onClick={ctx.handleSendBid} className="py-4 px-8 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-lg rounded-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-md flex items-center justify-center gap-2">
                  إرسال <Send size={20} />
               </button>
             </div>
           </>
         )}
      </div>
      <p className="text-xs font-bold text-slate-400">بانتظار الحكم لإعلان النتيجة بعد انتهاء المزايدات...</p>
    </div>
  );
}