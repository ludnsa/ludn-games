"use server";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatPlanDate, getPackageById } from "@/lib/packages";
import { extendSubscription } from "@/lib/subscriptions";

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

// دالة مساعدة لترجمة أسباب فشل الدفع إلى رسائل عربية واضحة ومطمئنة للعميل
function translateMoyasarError(status: string, rawMessage?: string): string {
  const msg = (rawMessage || "").toLowerCase();

  if (msg.includes("cancel")) {
    return "تم إلغاء عملية الدفع. لم يتم خصم أي مبلغ من حسابك.";
  }

  if (msg.includes("insufficient")) {
    return "الرصيد غير كافٍ لإتمام العملية. يرجى التأكد من رصيد البطاقة والمحاولة مرة أخرى.";
  }

  if (msg.includes("expired")) {
    return "البطاقة المستخدمة منتهية الصلاحية. يرجى استخدام بطاقة أخرى.";
  }

  return "لم تتم عملية الدفع. إذا تم خصم مبلغ من حسابك، سيتم إرجاعه تلقائياً خلال أيام. يرجى المحاولة مرة أخرى.";
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

    const { data: savedTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        payment_id: paymentId,
        user_id: userId,
        package_id: pkgId,
        amount: payment.amount,
        currency: payment.currency,
        status: "paid",
        payment_method: payment.source?.type || "unknown",
      })
      .select("id")
      .maybeSingle();

    // نفس الدفعة انحفظت من طلب ثاني بنفس اللحظة (الصفحة انفتحت مرتين) — ما نحسبها مرتين
    if (txError?.code === "23505") {
      return { success: true, message: "تم معالجة هذا الدفع مسبقاً ✅" };
    }
    if (txError) console.error("transactions insert error:", txError);

    // 8. الاشتراك: يتمدد من نهاية الاشتراك الحالي (أو من الحين لو منتهي)
    if (pkg.kind === "subscription" && pkg.days) {
      const endsAt = await extendSubscription(supabaseAdmin, userId, pkg.days);
      if (!endsAt) {
        // ما تفعّل: نشيل المعاملة عشان لو أعاد فتح الصفحة يتفعّل اشتراكه بدل "تم مسبقاً"
        if (savedTx?.id) await supabaseAdmin.from("transactions").delete().eq("id", savedTx.id);
        return { success: false, error: "تم الدفع بس صار خطأ بتفعيل الاشتراك — حدّث الصفحة، ولو تكرر تواصل معنا" };
      }
      return {
        success: true,
        message: `اشتراكك (${pkg.name}) فعّال لين ${formatPlanDate(endsAt)} 🎉`,
        endsAt,
      };
    }

    // 8. (الباقات القديمة) إضافة الرصيد للمستخدم
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("available_tokens")
      .eq("id", userId)
      .maybeSingle();

    const currentTokens = profile?.available_tokens || 0;
    const addTokens = pkg.tokens ?? 0;
    await supabaseAdmin
      .from("profiles")
      .update({ available_tokens: currentTokens + addTokens })
      .eq("id", userId);

    return {
      success: true,
      message: `تم إضافة ${addTokens} رصيد لحسابك بنجاح! 🎉`,
      newBalance: currentTokens + addTokens
    };

  } catch (err) {
    console.error("verifyAndFulfillPayment Error:", err);
    return { success: false, error: "حدث خطأ غير متوقع أثناء معالجة الدفع" };
  }
}
