"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

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

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUserSession(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setUserSession(user);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const userProfile = data || {
        full_name: user.user_metadata?.full_name || "لاعب جديد",
      };

      setProfile({ ...userProfile, email: user.email });
    } catch (err) {
      console.error("خطأ تقني أثناء جلب البيانات:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadUserData();
      } else {
        setUserSession(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ userSession, profile, isLoading, refreshProfile: loadUserData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
