import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ما فيه حد طلبات هنا: الدخول وإنشاء الحساب يروحون من المتصفح لـ Supabase مباشرة (ما يمرون على هذا الملف)،
// فالحد اللي كان هنا يحسب فتح صفحتي /login و/player والـ prefetch بس، ويوقف ناس على نفس الـ IP (شبكات الجوال).
// حد المحاولات الحين: عند Supabase لكل IP (Authentication > Rate Limits)، وعلى نفس الجهاز بالصفحة (lib/auth/attempt-limit.ts).

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // تهيئة الاتصال الآمن بالسيرفر لمعالجة الكوكيز
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // جلب بيانات المستخدم الموثق:
  // - لوحة التحكم: getUser (يسأل خادم Supabase، فالصلاحية وتسجيل الخروج يتطبقون على طول)
  // - باقي الصفحات: getClaims يتحقق من توقيع التوكن هنا بدون طلب لخادم Supabase مع كل صفحة.
  //   الاثنين يجددون التوكن لو قرّب يخلص (والكوكيز الجديدة تنكتب تحت في setAll)
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  let user: { app_metadata?: { [key: string]: unknown } } | null = null;
  if (isAdminRoute) {
    user = (await supabase.auth.getUser()).data.user;
  } else {
    const claims = (await supabase.auth.getClaims()).data?.claims;
    user = claims?.sub ? { app_metadata: claims.app_metadata } : null;
  }

  // الحماية الجدارية للوحة التحكم (Admin)
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // التحقق من صلاحية المدير من app_metadata.role
    if (user.app_metadata?.role !== 'admin') {
      // إذا لم يكن مديراً، يتم طرده لصفحة اللاعب
      return NextResponse.redirect(new URL("/player", request.url));
    }
  }

  // إذا هو مسجل دخول وحاول يرجع لصفحة الدخول، وجهه بناءً على صلاحياته
  if (request.nextUrl.pathname.startsWith("/login") && user) {
    if (user.app_metadata?.role === 'admin') {
      return NextResponse.redirect(new URL("/admin", request.url));
    } else {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // الحماية الجديدة: إذا حاول يدخل الألعاب أو الحساب الشخصي وهو مو مسجل، اطرده لصفحة اللاعب
  // يستثنى من ذلك مسارات الانضمام للغرف والمشاهدة التي يجب أن تكون متاحة للجميع بدون تسجيل حساب
  const isPublicGameRoute = request.nextUrl.pathname.match(/^\/games\/[^\/]+\/(join|audience|display|team)(\/.*)?$/);

  if (
    (request.nextUrl.pathname.startsWith("/games") || 
     request.nextUrl.pathname.startsWith("/my-games") || 
     request.nextUrl.pathname.startsWith("/profile")) && 
    !user && !isPublicGameRoute
  ) {
    return NextResponse.redirect(new URL("/player", request.url));
  }

  return supabaseResponse;
}

// تحديد المسارات اللي يشتغل عليها ملف الأمان (نستثني ملفات النظام والصور والأصوات والملفات الثابتة)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|html|txt|xml|webmanifest|woff2?)$).*)",
  ],
};