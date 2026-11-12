"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser, getBrowserSessionUser } from "@/lib/supabase/client";

type AuthContextType = {
  userSession: any;
  profile: any;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  userSession: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowser();
  const [userSession, setUserSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // رقم آخر طلب: لو خرج أو تغيّر الحساب وطلب قديم لسا ما رجع، نتجاهل نتيجته
  const loadSeq = useRef(0);
  // الحساب اللي اسمه انطلب بهالصفحة: تجديد التوكن، أو بداية الجلسة لو جات بعد تجديد، ما يعيدون الطلب.
  // يرجع null لو الجلب فشل، فأول تجديد بعده يحاول مرة ثانية
  const requestedUserId = useRef<string | null>(null);

  const clearUser = () => {
    loadSeq.current++;
    requestedUserId.current = null;
    setUserSession(null);
    setProfile(null);
    setIsLoading(false);
  };

  // الحساب من الجلسة المحفوظة بالمتصفح (بدون طلب لـ Supabase)، والاسم من profiles مرة وحدة.
  // هذا للعرض بالهيدر بس: أي شي فعلي (اللعب والدفع والأدمن) يتفحص بالسيرفر
  const loadProfile = async (user: User) => {
    const seq = ++loadSeq.current;
    requestedUserId.current = user.id;
    setUserSession(user);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (seq !== loadSeq.current) return;

      const userProfile = data || {
        full_name: user.user_metadata?.full_name || "لاعب جديد",
      };

      setProfile({ ...userProfile, email: user.email });
    } catch (err) {
      if (seq === loadSeq.current) requestedUserId.current = null;
      console.error("خطأ تقني أثناء جلب البيانات:", err);
    } finally {
      if (seq === loadSeq.current) setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const user = await getBrowserSessionUser();
    if (user) await loadProfile(user);
    else clearUser();
  };

  useEffect(() => {
    // طريق واحد: أول حدث (INITIAL_SESSION) يجيب الجلسة المحفوظة، وبعده الدخول والخروج وتعديل الحساب.
    // تجديد التوكن (كل ساعة تقريباً) ما يغيّر الحساب ولا الاسم، فما نعيد الجلب معه
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (user && (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && requestedUserId.current === user.id) return;
      if (user) requestedUserId.current = user.id;
      // طلبات Supabase تنعمل برا دالة الحدث (توصية Supabase عشان ما يعلق)
      setTimeout(() => {
        if (user) void loadProfile(user);
        else clearUser();
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    clearUser();
  };

  return (
    <AuthContext.Provider value={{ userSession, profile, isLoading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
