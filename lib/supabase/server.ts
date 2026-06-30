import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client factory — استخدمه في Server Actions و Route Handlers فقط
// كل استدعاء يُنشئ client جديد مع الكوكيز الحالية للطلب
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // يتم تجاهل الخطأ هنا لأن التحديث قد يتم من Server Component
          }
        },
      },
    }
  );
}

// Service Role Client - يمتلك كامل الصلاحيات ويتجاهل RLS (يستخدم للتحديثات الآمنة من السيرفر)
export function getSupabaseServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}
