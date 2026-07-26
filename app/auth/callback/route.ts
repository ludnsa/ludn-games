import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // استخراج المتغير next

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // يتم تجاهل الخطأ هنا لأن الاستدعاء ممكن يكون من Server Component
            }
          },
        },
      }
    )
    
    // تحويل الكود السري إلى جلسة (Session) معتمدة
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // التحقق من الرابط لمنع (Open Redirect)
      let safeNext = '/';
      if (next) {
        // التأكد من أن الرابط يبدأ بـ / ولا يبدأ بـ // أو http
        if (next.startsWith('/') && !next.startsWith('//')) {
          safeNext = next;
        }
      }

      // إذا كان هناك رابط توجيه مخصص (next) نعطيه الأولوية
      if (safeNext !== '/') {
        return NextResponse.redirect(`${origin}${safeNext}`)
      }

      // جلب بيانات المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // الفرز يشتغل بناءً على القيمة المخزنة بـ app_metadata.role حسب طلب المستخدم
        if (user.app_metadata?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin`)
        } else {
          return NextResponse.redirect(`${origin}/`)
        }
      }
    }
  }

  // في حال فشل تسجيل الدخول، يرجعه لصفحة اللاعبين
  return NextResponse.redirect(`${origin}/player?error=auth-failed`)
}