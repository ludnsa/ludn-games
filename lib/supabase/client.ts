// Browser-side Supabase singleton — استخدمه في كل مكوّن أو hook على الـ client
// هذا هو المصدر الوحيد لإنشاء Supabase Client في جميع ملفات الـ client
import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * الحساب المحفوظ بالمتصفح (getSession): بدون طلب لخادم Supabase، إلا لو التوكن يحتاج تجديد.
 * يكفي لـ"مسجّل ولا لا" قبل فحص الدخول بصفحات الألعاب، لأن دوال السيرفر تتحقق من الحساب بنفسها.
 */
export async function getBrowserSessionUser() {
  const {
    data: { session },
  } = await getSupabaseBrowser().auth.getSession();
  return session?.user ?? null;
}
