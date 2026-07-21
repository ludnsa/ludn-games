"use server";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getPackageById } from "@/lib/packages";

function getServiceCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

// دالة مساعدة للانتظار
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// دالة للتحقق من حالة الدفع من Moyasar API
async function fetchPaymentStatus(paymentId: string, moyasarSecret: string) {
  const res = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(moyasarSecret + ":").toString("base64")}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

// دالة مساعدة لترجمة أسباب فشل الدفع إلى اللغة العربية بشكل دقيق لكل حالة
function translateMoyasarError(status: string, rawMessage?: string): string {
  const msg = (rawMessage || "").toLowerCase();

  // 1. إلغاء عملية التحقق (Authentication Cancelled)
  if (msg.includes("cancel")) {
    return "تم إلغاء عملية التحقق من الدفع.";
  }

  // 2. غير متوفر (Authentication Not Available)
  if (msg.includes("unavailable") || msg.includes("not available") || msg.includes("not_available")) {
    return "خدمة التوثيق (3DS) غير متوفرة لهذه البطاقة.";
  }

  // 3. رفض التوثيق من البنك (Authentication Rejected)
  if (msg.includes("reject")) {
    return "تم رفض طلب التوثيق من البنك المصدر للبطاقة.";
  }

  // 4. خطأ خادم التوثيق (Authentication Server Error)
  if (msg.includes("server") || msg.includes("error")) {
    return "حدث خطأ في خادم التوثيق التابع للبنك (ACS Server Error).";
  }

  // 5. رفض الحساب / رفض العملية (Not Authenticated / Transaction Denied / Declined)
  if (msg.includes("denied") || msg.includes("not authenticated") || msg.includes("not verified")) {
    return "تم رفض المعاملة: الحساب غير موثق أو رفض البنك المعاملة.";
  }

  if (msg.includes("declined")) {
    return "تم رفض عملية التوثيق من قِبَل البنك المصدر للبطاقة.";
  }

  if (msg.includes("insufficient")) {
    return "الرصيد المتوفر في البطاقة غير كافٍ لإتمام العملية.";
  }

  if (msg.includes("expired")) {
    return "بطاقة الدفع المستخدمة منتهية الصلاحية.";
  }

  return rawMessage ? `فشلت عملية الدفع: ${rawMessage}` : "فشلت عملية الدفع، يرجى التأكد من بيانات البطاقة والمحاولة مرة أخرى.";
}

export async function verifyAndFulfillPayment(paymentId: string, pkgId: number) {
  try {
    // 1. التحقق من هوية المستخدم عبر الجلسة الموثقة
    const supabaseServer = await getSupabaseServer();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً" };
    }
    const userId = user.id;

    // 2. الحصول على بيانات الباقة
    const pkg = getPackageById(pkgId);
    if (!pkg) {
      return { success: false, error: "الباقة غير موجودة" };
    }

    // 3. إعداد Supabase Admin
    const creds = getServiceCredentials();
    if (!creds) {
      return { success: false, error: "خطأ في إعدادات السيرفر" };
    }
    const supabaseAdmin = createClient(creds.url, creds.key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 4. التحقق من عدم معالجة هذا الدفع مسبقاً (فقط المعاملات الناجحة)
    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id, status")
      .eq("payment_id", paymentId)
      .eq("status", "paid")
      .maybeSingle();

    if (existingTx) {
      return { success: true, message: "تم معالجة هذا الدفع مسبقاً ✅" };
    }

    // 5. التحقق من الدفع عبر Moyasar API مع إعادة المحاولة
    const moyasarSecret = process.env.MOYASAR_SECRET_KEY;
    if (!moyasarSecret) {
      return { success: false, error: "مفتاح ميسر غير متوفر" };
    }

    // محاولة التحقق مع إعادة المحاولة (ميسر قد يحتاج وقت لمعالجة الدفع)
    const maxRetries = 3;
    const retryDelayMs = 2000; // ثانيتين بين كل محاولة
    let payment = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      payment = await fetchPaymentStatus(paymentId, moyasarSecret);

      if (!payment) {
        return { success: false, error: "فشل التحقق من عملية الدفع" };
      }

      // إذا الحالة paid أو فشل نهائي، نتوقف
      if (payment.status === "paid" || payment.status === "failed") {
        break;
      }

      // إذا الحالة لسا قيد المعالجة (initiated/authorized)، ننتظر ونعيد المحاولة
      if (attempt < maxRetries) {
        await delay(retryDelayMs);
      }
    }

    if (!payment) {
      return { success: false, error: "فشل التحقق من عملية الدفع" };
    }

    // 6. التحقق من حالة الدفع والمبلغ
    const expectedAmountInHalalas = Math.round(pkg.price * 100);

    if (payment.status !== "paid") {
      const failReason = payment.source?.message || "";
      console.log("Moyasar Failed Payment Raw Data:", { status: payment.status, message: failReason, source: payment.source });
      const translatedError = translateMoyasarError(payment.status, failReason);
      return { success: false, error: translatedError };
    }

    if (payment.amount !== expectedAmountInHalalas) {
      return { success: false, error: "المبلغ المدفوع لا يتطابق مع سعر الباقة" };
    }

    if (payment.currency !== "SAR") {
      return { success: false, error: "العملة غير صحيحة" };
    }

    // 7. حذف أي معاملة فاشلة سابقة لنفس الدفعة (إن وُجدت) ثم حفظ الناجحة
    await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("payment_id", paymentId)
      .neq("status", "paid");

    await supabaseAdmin.from("transactions").insert({
      payment_id: paymentId,
      user_id: userId,
      package_id: pkgId,
      amount: payment.amount,
      currency: payment.currency,
      status: "paid",
      payment_method: payment.source?.type || "unknown",
    });

    // 8. إضافة الرصيد للمستخدم
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_tokens")
      .eq("id", userId)
      .maybeSingle();

    const currentTokens = profile?.available_tokens || 0;
    await supabaseAdmin
      .from("profiles")
      .update({ available_tokens: currentTokens + pkg.tokens })
      .eq("id", userId);

    return {
      success: true,
      message: `تم إضافة ${pkg.tokens} رصيد لحسابك بنجاح! 🎉`,
      newBalance: currentTokens + pkg.tokens
    };

  } catch (err) {
    console.error("verifyAndFulfillPayment Error:", err);
    return { success: false, error: "حدث خطأ غير متوقع أثناء معالجة الدفع" };
  }
}
