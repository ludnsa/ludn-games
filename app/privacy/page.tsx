import React from "react";
import { SitePage } from "@/components/home/SitePage";

export const metadata = {
  title: "سياسة الخصوصية | منصة ألعاب لدن",
};

/** تاريخ آخر تحديث: يتغير مع كل تعديل على نص السياسة */
const LAST_UPDATED = "8 نوفمبر 2026";

// نفس تنسيق صفحة الشروط (app/terms/page.tsx)
const TITLE = "font-display text-[32px] md:text-[42px] leading-[1.2] text-ludn-fg mb-2 text-balance";
const BODY = "space-y-3.5 text-ludn-fg/85 font-semibold text-[15px] leading-loose";
const BLOCK = "rounded-[18px] bg-ludn-surface border border-ludn-line p-4 md:p-6";
const H2 = "text-base md:text-lg font-black text-ludn-gold-text mb-2";
const LIST = "list-disc ps-5 space-y-2 marker:text-ludn-gold-text";
const LINK = "text-ludn-gold-text underline underline-offset-4";

const EMAIL = (
  <a href="mailto:contact@ludn.sa" dir="ltr" className={LINK}>
    contact@ludn.sa
  </a>
);

export default function PrivacyPage() {
  return (
    <SitePage width="max-w-3xl">
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className={TITLE}>سياسة الخصوصية: منصة ألعاب لدن</h1>
          <p className="text-sm font-bold text-ludn-muted">
            <strong>آخر تحديث:</strong> {LAST_UPDATED}
          </p>
        </div>

        <div className={BODY}>
          <p>
            نحترم خصوصيتك في منصة ألعاب لدن (games.ludn.sa)، ونلتزم بحماية بياناتك وفق نظام حماية البيانات الشخصية في المملكة العربية
            السعودية. توضح هذه السياسة باختصار البيانات التي نجمعها، وكيف نستخدمها ونحميها.
          </p>

          <section className={BLOCK}>
            <h2 className={H2}>1. البيانات التي نجمعها</h2>
            <ul className={LIST}>
              <li>
                <strong>بيانات الحساب:</strong> الاسم والبريد الإلكتروني، وكلمة المرور (محفوظة مشفّرة)، أو بيانات الدخول بحساب Google إذا
                اخترته. ورقم الجوال اختياري.
              </li>
              <li>
                <strong>بيانات الاشتراك والدفع:</strong> سجل العمليات وحالة الاشتراك. أما بيانات البطاقة فتُدخل مباشرة في بوابة دفع
                مرخّصة، <strong>ولا نطّلع عليها ولا نخزّنها</strong>.
              </li>
              <li>
                <strong>بيانات اللعب:</strong> أسماء الفرق واللاعبين التي تُكتب داخل الغرف، ونتائج اللعب. واللاعبون المنضمّون بالكود لا
                يحتاجون حساباً.
              </li>
              <li>
                <strong>رسائل التواصل:</strong> ما ترسله لنا عبر نموذج &quot;تواصل معنا&quot;.
              </li>
              <li>
                <strong>بيانات تقنية:</strong> سجلات تشغيلية أساسية لحماية الحساب وتشغيل الخدمة.
              </li>
            </ul>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>2. كيف نستخدم بياناتك</h2>
            <p className="mb-2">نستخدم بياناتك فقط لـ:</p>
            <ul className={LIST}>
              <li>تشغيل حسابك والألعاب وحمايتها.</li>
              <li>التحقق من اشتراكك ومعالجة المدفوعات.</li>
              <li>الرد على رسائلك وطلباتك.</li>
              <li>تحسين المنصة وإصلاح الأعطال.</li>
            </ul>
            <p className="mt-3">
              <strong>لا نبيع بياناتك، ولا نشاركها مع أي جهة لأغراض تسويقية.</strong>
            </p>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>3. مشاركة البيانات</h2>
            <p>
              نستعين بمزوّدي خدمات موثوقين لتشغيل المنصة، مثل الاستضافة وقواعد البيانات وبوابة الدفع وتسجيل الدخول. ولا يصلهم إلا ما
              يلزم لأداء خدمتهم. وقد نفصح عن البيانات إذا طلبت ذلك جهة رسمية مختصة وفق الأنظمة.
            </p>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>4. ملفات تعريف الارتباط (الكوكيز)</h2>
            <ul className={LIST}>
              <li>نستخدم كوكيز الجلسة فقط لإبقائك مسجّل الدخول.</li>
              <li>
                <strong>لا نستخدم كوكيز إعلانية، ولا أدوات تتبع.</strong>
              </li>
              <li>نحفظ في متصفحك بعض الإعدادات وحالة اللعب الجارية، ويمكنك مسحها من إعدادات المتصفح في أي وقت.</li>
            </ul>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>5. حماية البيانات والاحتفاظ بها</h2>
            <ul className={LIST}>
              <li>الاتصال بالمنصة مشفّر، والوصول إلى البيانات محصور بالمخوّلين.</li>
              <li>نحتفظ ببياناتك طالما حسابك قائم أو بالقدر الذي تتطلبه الأنظمة، ونحذفها عند طلبك.</li>
            </ul>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>6. حقوقك</h2>
            <p>
              لك الحق في معرفة بياناتك، وطلب نسخة منها، وتصحيحها، وطلب حذف حسابك وبياناتك. ويمكنك تعديل الاسم والجوال مباشرة من صفحة
              &quot;حسابي&quot;.
            </p>
            <p className="mt-2">
              ولأي طلب آخر راسلنا على <strong>{EMAIL}</strong> من البريد المسجّل في حسابك.
            </p>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>7. من هم دون 18 سنة</h2>
            <p>يستخدم من هم دون 18 سنة المنصة بموافقة وليّ الأمر وتحت إشرافه.</p>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>8. التعديلات على السياسة</h2>
            <p>قد نحدّث هذه السياسة من وقت لآخر، ونعدّل تاريخ &quot;آخر تحديث&quot; أعلاه.</p>
          </section>

          <section className={BLOCK}>
            <h2 className={H2}>9. التواصل</h2>
            <ul className={LIST}>
              <li>
                <strong>البريد الإلكتروني:</strong> {EMAIL}
              </li>
              <li>
                <strong>واتساب:</strong>{" "}
                <a href="https://wa.me/966551014446" target="_blank" rel="noopener noreferrer" dir="ltr" className={LINK}>
                  +966 55 101 4446
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </SitePage>
  );
}
