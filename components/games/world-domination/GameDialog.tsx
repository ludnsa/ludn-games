"use client";

import React from "react";
import { Shield, HelpCircle } from "lucide-react";

interface GameDialogProps {
  dialog: {
    isOpen: boolean;
    type: "alert" | "confirm";
    message: string | React.ReactNode;
    onConfirm?: () => void;
  };
  closeDialog: () => void;
}

export default function GameDialog({ dialog, closeDialog }: GameDialogProps) {
  if (!dialog.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 max-w-sm w-full border-b-4 border-blue-500 text-center shadow-2xl animate-in zoom-in-95 relative">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          {dialog.type === "alert" ? (
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          ) : (
            <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <div className="text-slate-800 dark:text-slate-200 font-black text-lg mb-6 leading-relaxed whitespace-pre-line">
          {dialog.message}
        </div>
        <div className="flex gap-3 justify-center">
          {dialog.type === "confirm" && (
            <button
              onClick={closeDialog}
              className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl font-black transition-colors border-b-4 border-slate-300 dark:border-slate-900 active:border-b-0 active:translate-y-[4px]"
            >
              إلغاء
            </button>
          )}
          <button
            onClick={() => {
              if (dialog.type === "confirm" && dialog.onConfirm) {
                dialog.onConfirm();
              }
              closeDialog();
            }}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-colors shadow-md border-b-4 border-blue-800 active:border-b-0 active:translate-y-[4px]"
          >
            {dialog.type === "confirm" ? "تأكيد" : "حسناً"}
          </button>
        </div>
      </div>
    </div>
  );
}