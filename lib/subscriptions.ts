import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * الاشتراكات بقاعدة البيانات (supabase/migrations/0008_subscriptions.sql).
 * للسيرفر بس، وبمفتاح service role — الجدول مقفول على المتصفح.
 * هذا الملف مو "use server" عمداً: دواله ما تنستدعى من المتصفح.
 */

/** تاريخ نهاية اشتراك المستخدم (null = ما عنده، أو الجدول مو موجود للحين) */
export async function getSubscriptionEndsAt(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.from("user_subscriptions").select("ends_at").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("user_subscriptions (شغّل supabase/migrations/0008_subscriptions.sql):", error.message);
    return null;
  }
  return (data?.ends_at as string | undefined) ?? null;
}

/** نهاية اشتراك كل المستخدمين (للوحة التحكم) */
export async function getAllSubscriptions(admin: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await admin.from("user_subscriptions").select("user_id, ends_at");
  if (error) {
    console.warn("user_subscriptions (شغّل supabase/migrations/0008_subscriptions.sql):", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r: { user_id: string; ends_at: string }) => [r.user_id, r.ends_at]));
}

/**
 * يمدد الاشتراك كذا يوم — من نهاية الاشتراك الحالي، أو من الحين لو منتهي.
 * يرجع تاريخ النهاية الجديد، أو null لو فشل.
 */
export async function extendSubscription(admin: SupabaseClient, userId: string, days: number): Promise<string | null> {
  const { data, error } = await admin.rpc("extend_subscription", { p_user_id: userId, p_days: days });
  if (error) {
    console.error("extend_subscription error:", error);
    return null;
  }
  return (data as string | null) ?? null;
}

/** يلغي الاشتراك (لوحة التحكم) */
export async function cancelSubscription(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await admin.from("user_subscriptions").delete().eq("user_id", userId);
  if (error) console.error("cancelSubscription error:", error);
  return !error;
}
