"use client";
import React from "react";
import { MapPin, HelpCircle } from "lucide-react";
import { SEGMENTS, segment } from "@/components/admin/layout/adminUi";

export default function WorldDominationTabs({ wdActiveSubTab, setWdActiveSubTab }: any) {
  return (
    <div className={`${SEGMENTS} bg-ludn-surface border border-ludn-line`}>
      <button
        onClick={() => setWdActiveSubTab("map")}
        className={segment(wdActiveSubTab === "map")}
      >
        <MapPin size={18} /> الخريطة والدول
      </button>
      <button
        onClick={() => setWdActiveSubTab("challenges")}
        className={segment(wdActiveSubTab === "challenges")}
      >
        <HelpCircle size={18} /> بنك تحديات الحكم
      </button>
    </div>
  );
}
