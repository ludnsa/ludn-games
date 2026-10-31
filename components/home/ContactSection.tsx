"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { submitContactMessage } from "@/actions/contact";
import { toast } from "sonner";
import { FIELD, LABEL } from "./ui";

const CONTACTS = [
  { Icon: Mail, label: "البريد الإلكتروني", value: "contact@ludn.sa", ltr: true },
  { Icon: Phone, label: "رقم الجوال", value: "055 101 4446", ltr: true },
  { Icon: MapPin, label: "الموقع", value: "المملكة العربية السعودية", ltr: false },
];

export const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await submitContactMessage(formData);

    if (result.success) {
      toast.success(result.message);
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <section id="contact-section" className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-display text-[30px] md:text-[40px] leading-tight text-ludn-fg">عندك فكرة ألعاب ؟</h2>
        <p className="text-ludn-muted font-semibold">شاركنا فكرة اللعبة ونصممها لك</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <ul className="grid gap-2.5 content-start lg:col-span-5">
          {CONTACTS.map(({ Icon, label, value, ltr }) => (
            <li key={label} className="flex items-center gap-3.5 rounded-[18px] bg-ludn-surface border border-ludn-line p-3.5">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
                <Icon size={21} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-bold text-ludn-muted">{label}</span>
                <span className="block font-black text-ludn-fg break-words" dir={ltr ? "ltr" : undefined}>
                  {value}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="lg:col-span-7 rounded-[22px] bg-ludn-surface border border-ludn-line p-4 md:p-6">
          <h3 className="font-display text-[24px] text-ludn-fg mb-4 flex items-center gap-2.5">
            <Send size={22} className="text-ludn-gold-text" /> أرسل رسالة
          </h3>
          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="contact-name" className={LABEL}>الاسم الكامل</label>
                <input id="contact-name" name="name" type="text" className={FIELD} placeholder="اسمك..." required />
              </div>
              <div>
                <label htmlFor="contact-phone" className={LABEL}>رقم الجوال</label>
                <input id="contact-phone" name="phone" type="tel" className={FIELD} placeholder="05x xxx xxxx" required />
              </div>
            </div>
            <div>
              <label htmlFor="contact-email" className={LABEL}>البريد الإلكتروني</label>
              <input id="contact-email" name="email" type="email" className={FIELD} placeholder="example@email.com" required />
            </div>
            <div>
              <label htmlFor="contact-message" className={LABEL}>الرسالة</label>
              <textarea
                id="contact-message"
                name="message"
                rows={4}
                maxLength={200}
                className={`${FIELD} resize-none`}
                placeholder="كيف نخدمك؟ (الحد الأقصى 200 حرف)"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] rounded-2xl bg-ludn-gold text-ludn-gold-ink font-black text-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "جاري الإرسال..." : "إرسال الرسالة"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
