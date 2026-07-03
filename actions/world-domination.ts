"use server";

import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase/server";
import { WDCountry } from "../types";
import { WDRoomPayloadSchema } from "@/lib/schemas";

// جلب بنك الدول والتحديات من الإعدادات
export async function getWDSettings() {
  const supabase = await getSupabaseServer();
  
  const { data, error } = await supabase
    .from("wd_settings")
    .select("*")
    .in("id", ["admin_wd_countries_db", "admin_wd_challenges_db"]);

  if (error) {
    console.error("خطأ في جلب بيانات البنك:", error);
    return { countries: [] as WDCountry[], challenges: [] as string[] };
  }

  let countries: WDCountry[] = [];
  let challenges: string[] = [];

  data?.forEach((item) => {
    if (item.id === "admin_wd_countries_db") countries = item.data || [];
    if (item.id === "admin_wd_challenges_db") challenges = item.data || [];
  });

  return { countries, challenges };
}

// مزامنة حالة الغرفة (تحديث أو إنشاء)
export async function syncRoomState(roomCode: string, payload: any) {
  // التحقق من هوية المستخدم أولاً لضمان الأمان
  const userClient = await getSupabaseServer();
  const { data: { user }, error: authError } = await userClient.auth.getUser();

  if (authError || !user) {
    console.error("Unauthorized room sync attempt:", authError);
    return { success: false, error: "Unauthorized: You must be logged in to modify room state." };
  }

  // استخدام صلاحيات الأدمن فقط لتجاوز RLS وتحديث البيانات
  const supabase = getSupabaseServiceRole();
  
  // التحقق من صحة البيانات باستخدام Zod
  const validationResult = WDRoomPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    console.error("Payload validation failed:", validationResult.error);
    return { success: false, error: "Invalid payload format" };
  }

  const { error } = await supabase.from("wd_rooms").upsert({
    room_code: roomCode,
    ...validationResult.data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("خطأ في مزامنة الغرفة:", error);
    return { success: false, error };
  }

  return { success: true };
}