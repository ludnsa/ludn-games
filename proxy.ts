/*
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// قائمة الإيميلات المصرح لها بالدخول للوحة التحكم (الآدمن)
const ALLOWED_ADMINS = ["z.y.t9088@gmail.com", "zyonazi88@gmail.com"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // التحقق من الدخول وصلاحية الإيميل لمسارات الآدمن
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // يطرد المستخدم إذا ما كان مسجل دخول، أو إذا إيميله مو موجود في قائمة ALLOWED_ADMINS
    if (!user || !user.email || !ALLOWED_ADMINS.includes(user.email)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
*/
