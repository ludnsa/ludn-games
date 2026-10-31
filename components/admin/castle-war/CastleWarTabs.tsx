"use client";
import React from "react";
import { Clock, Timer, Target, HelpCircle } from "lucide-react";
import { SEGMENTS, segment } from "@/components/admin/layout/adminUi";

export default function CastleWarTabs({ cwActiveSubTab, setCwActiveSubTab }: any) {
  const tabs = [
    { id: "30sec", icon: <Clock size={16} />, label: "30 ثانية" },
    { id: "5sec", icon: <Timer size={16} />, label: "5 ثواني" },
    { id: "team", icon: <Target size={16} />, label: "تحدي الفريق" },
    { id: "general", icon: <HelpCircle size={16} />, label: "أسئلة عامة" },
  ];

  return (
    <div className={SEGMENTS}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setCwActiveSubTab(tab.id)}
          className={segment(cwActiveSubTab === tab.id)}
        >
          {tab.icon} <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
