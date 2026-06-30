"use client";
import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { WDCountry } from "@/types";
import { toast } from "sonner";

export function useWorldDominationAdmin() {
  const supabase = getSupabaseBrowser();

  const [wdActiveSubTab, setWdActiveSubTab] = useState<"map" | "challenges">("map");
  const [isLoading, setIsLoading] = useState(true);
  const [wdCountries, setWdCountries] = useState<WDCountry[]>([]);
  const [newWdCountryName, setNewWdCountryName] = useState<string>("");
  const [selectedGeoId, setSelectedGeoId] = useState<string | null>(null);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [managingQuestionsFor, setManagingQuestionsFor] = useState<string | null>(null);
  
  const [newWdQ, setNewWdQ] = useState<string>("");
  const [wdOpt1, setWdOpt1] = useState<string>("");
  const [wdOpt2, setWdOpt2] = useState<string>("");
  const [wdOpt3, setWdOpt3] = useState<string>("");
  const [wdCorrectOpt, setWdCorrectOpt] = useState<number>(1);

  const [wdChallengesDB, setWdChallengesDB] = useState<string[]>([]);
  const [newWdChallenge, setNewWdChallenge] = useState<string>("");

  const formRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from("wd_settings").select("*");
        if (data && !error) {
          data.forEach((item) => {
            if (item.id === "admin_wd_countries_db") setWdCountries(item.data);
            if (item.id === "admin_wd_challenges_db") setWdChallengesDB(item.data);
          });
        }
      } catch (e) {
        console.error("Error loading WD data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [supabase]);

  const saveToSupabase = async (id: string, data: any) => {
    try {
      const { error } = await supabase
        .from("wd_settings")
        .upsert({ id, data, updated_at: new Date().toISOString() });
        
      if (error) {
        console.error("تفاصيل الخطأ من Supabase:", error);
        toast.error("تعذر الحفظ في قاعدة البيانات ❌: " + error.message);
      }
    } catch (err) {
      console.error("خطأ عام:", err);
      toast.error("مشكلة في الاتصال بالسيرفر!");
    }
  };

  const scrollToForm = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const scrollToQuestions = () => {
    setTimeout(() => {
      questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const addWdCountry = async () => {
    if (!selectedGeoId || !newWdCountryName.trim()) {
      toast.error("الرجاء اختيار دولة من الخريطة وكتابة اسمها أولاً.");
      return;
    }

    if (editingCountryId) {
      const newData = wdCountries.map((c) =>
        c.id === editingCountryId ? { ...c, name: newWdCountryName.trim(), geoId: selectedGeoId } : c
      );
      setWdCountries(newData);
      await saveToSupabase("admin_wd_countries_db", newData);
      setEditingCountryId(null);
    } else {
      const newCountry: WDCountry = {
        id: `c_${Date.now()}`, geoId: selectedGeoId, name: newWdCountryName.trim(), value: 0, questions: [],
        isActive: true, isChallenge: false, owner: null, lastOwner: null, originalValue: 0
      };
      const newData = [...wdCountries, newCountry];
      setWdCountries(newData);
      await saveToSupabase("admin_wd_countries_db", newData);
      setManagingQuestionsFor(newCountry.id);
      scrollToQuestions();
    }
    setNewWdCountryName("");
    setSelectedGeoId(null);
  };

  const startEditingWdCountry = (c: WDCountry) => {
    setEditingCountryId(c.id);
    setNewWdCountryName(c.name);
    setSelectedGeoId(c.geoId);
    scrollToForm();
  };

  const cancelEditWdCountry = () => {
    setEditingCountryId(null);
    setNewWdCountryName("");
    setSelectedGeoId(null);
  };

  const deleteWdCountry = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الدولة بالكامل؟")) {
      const newData = wdCountries.filter((c) => c.id !== id);
      setWdCountries(newData);
      await saveToSupabase("admin_wd_countries_db", newData);
      if (editingCountryId === id) cancelEditWdCountry();
      if (managingQuestionsFor === id) setManagingQuestionsFor(null);
    }
  };

  const addWdQuestion = async () => {
    if (!newWdQ.trim() || !wdOpt1.trim() || !wdOpt2.trim() || !wdOpt3.trim() || !managingQuestionsFor) {
      toast.error("الرجاء تعبئة السؤال والخيارات الثلاثة.");
      return;
    }

    const options = [wdOpt1.trim(), wdOpt2.trim(), wdOpt3.trim()];
    const answer = options[wdCorrectOpt - 1];

    const newData = wdCountries.map((c) => {
      if (c.id === managingQuestionsFor) {
        return { ...c, questions: [...(c.questions || []), { q: newWdQ.trim(), options, a: answer }] };
      }
      return c;
    });
    setWdCountries(newData);
    await saveToSupabase("admin_wd_countries_db", newData);

    setNewWdQ(""); setWdOpt1(""); setWdOpt2(""); setWdOpt3(""); setWdCorrectOpt(1);
  };

  const deleteWdQuestion = async (qIndex: number) => {
    const newData = wdCountries.map((c) => {
      if (c.id === managingQuestionsFor) {
        const updatedQ = [...(c.questions || [])];
        updatedQ.splice(qIndex, 1);
        return { ...c, questions: updatedQ };
      }
      return c;
    });
    setWdCountries(newData);
    await saveToSupabase("admin_wd_countries_db", newData);
  };

  const addWdChallenge = async () => {
    if (!newWdChallenge.trim()) return;
    const newData = [...wdChallengesDB, newWdChallenge.trim()];
    setWdChallengesDB(newData);
    await saveToSupabase("admin_wd_challenges_db", newData);
    setNewWdChallenge("");
  };

  const deleteWdChallenge = async (idx: number) => {
    const newData = wdChallengesDB.filter((_, i) => i !== idx);
    setWdChallengesDB(newData);
    await saveToSupabase("admin_wd_challenges_db", newData);
  };

  return {
    wdActiveSubTab, setWdActiveSubTab, isLoading,
    wdCountries, newWdCountryName, setNewWdCountryName,
    selectedGeoId, setSelectedGeoId, editingCountryId,
    managingQuestionsFor, setManagingQuestionsFor,
    newWdQ, setNewWdQ, wdOpt1, setWdOpt1, wdOpt2, setWdOpt2, wdOpt3, setWdOpt3, wdCorrectOpt, setWdCorrectOpt,
    wdChallengesDB, newWdChallenge, setNewWdChallenge,
    formRef, questionsRef,
    scrollToForm, scrollToQuestions, addWdCountry, startEditingWdCountry, cancelEditWdCountry, deleteWdCountry,
    addWdQuestion, deleteWdQuestion, addWdChallenge, deleteWdChallenge
  };
}