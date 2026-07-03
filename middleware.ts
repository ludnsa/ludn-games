import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// بسيط وسريع: تتبع محلي لطلبات الـ IP (يعمل بشكل جيد في بيئات Serverless لمنع السبام السريع)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // دقيقة واحدة
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 طلبات في الدقيقة للصفحات الحساسة

function checkRateLimit(request: NextRequest): boolean {
  // تطبيق الحد من الطلبات فقط على مسارات تسجيل الدخول والتسجيل
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/player");
  
  if (!isAuthRoute) return true; // مسموح للطلبات الأخرى

  // الحصول على IP المستخدم
  const ip = request.headers.get("x-forwarded-for") || "unknown-ip";
  const now = Date.now();
  
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  // إعادة تعيين العداد إذا مر الوقت المحدد
  if (now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // تم تجاوز الحد
  }

  record.count += 1;
  return true;
}

export async function middleware(request: NextRequest) {
  // التحقق من الحد من الطلبات (Rate Limiting) أولاً
  if (!checkRateLimit(request)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests, please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

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

  // جلب بيانات المستخدم الموثق
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // الحماية الجدارية للوحة التحكم (Admin)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // التحقق من صلاحية المدير
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'Admin') {
      // إذا لم يكن مديراً، يتم طرده لصفحة اللاعب
      return NextResponse.redirect(new URL("/player", request.url));
    }
  }

  // إذا هو مسجل دخول وحاول يرجع لصفحة الدخول، وجهه للوحة التحكم
  if (request.nextUrl.pathname.startsWith("/login") && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
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

// تحديد المسارات اللي يشتغل عليها ملف الأمان (نستثني ملفات النظام والصور)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};