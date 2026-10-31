"use client";
import React from "react";
import { Inbox, User, Calendar, Trash2, Phone, Mail, MessageCircle } from "lucide-react";
import { PANEL, EMPTY, SPINNER, ICON_BTN_DANGER } from "@/components/admin/layout/adminUi";

const WhatsAppIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function MessagesContent({ ctx }: { ctx: any }) {
  const { loading, messages, viewMode, deleteMessage, formatDate } = ctx;

  const formatWhatsAppLink = (phone: string) => {
    // إزالة كل الرموز غير الرقمية
    const cleanPhone = phone.replace(/\D/g, '');
    // التأكد من أن الرقم يبدأ بكود السعودية أو إضافة الكود إن لم يكن موجوداً
    // (اغلب الأرقام في السعودية تبدأ ب 05 او 5)
    let waNumber = cleanPhone;
    if (cleanPhone.startsWith('05')) {
      waNumber = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
      waNumber = '966' + cleanPhone;
    }
    return `https://wa.me/${waNumber}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className={`${SPINNER} w-12 h-12`}></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`${EMPTY} py-20`}>
        <Inbox size={56} className="opacity-40" />
        <h3 className="font-display text-[24px] text-ludn-fg">الصندوق فاضي</h3>
        <p>ما فيه أي رسائل جديدة حتى الآن.</p>
      </div>
    );
  }

  const whatsAppButton = (phone: string, compact = false) => (
    <a
      href={formatWhatsAppLink(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={`shrink-0 flex items-center gap-1.5 rounded-lg bg-[#25D366]/12 text-[#1ea952] dark:text-[#25D366] hover:bg-[#25D366] hover:text-white text-xs font-black transition-colors ${compact ? "px-2.5 py-1" : "px-3 py-1.5"}`}
      title="مراسلة واتساب"
    >
      <WhatsAppIcon size={compact ? 14 : 16} />
      واتساب
    </a>
  );

  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`${PANEL} flex flex-col gap-4 h-full`}>
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
                  <User size={22} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-black text-lg truncate">{msg.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ludn-muted mt-0.5">
                    <Calendar size={13} />
                    <span>{formatDate(msg.created_at)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteMessage(msg.id)}
                className={ICON_BTN_DANGER}
                title="حذف الرسالة"
                aria-label="حذف الرسالة"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {(msg.phone || msg.email) && (
              <div className="grid gap-2.5 rounded-2xl bg-ludn-surface-2 p-3.5">
                {msg.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-sm font-bold min-w-0">
                      <Phone size={16} className="shrink-0 text-ludn-gold-text" />
                      <span dir="ltr">{msg.phone}</span>
                    </div>
                    {whatsAppButton(msg.phone)}
                  </div>
                )}
                {msg.email && (
                  <div className="flex items-center gap-2.5 text-sm font-bold min-w-0">
                    <Mail size={16} className="shrink-0 text-ludn-gold-text" />
                    <span className="break-all">{msg.email}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grow flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <MessageCircle size={17} className="text-ludn-gold-text" />
                <span className="text-sm font-black">محتوى الرسالة:</span>
              </div>
              <div className="rounded-2xl border border-ludn-line p-4 grow">
                <p className="text-ludn-fg/90 font-semibold text-[15px] leading-loose whitespace-pre-wrap break-words">
                  {msg.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[22px] bg-ludn-surface border border-ludn-line overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="bg-ludn-surface-2 border-b border-ludn-line">
            <tr>
              <th className="p-4 md:p-5 font-black text-sm text-ludn-muted whitespace-nowrap">المرسل والتاريخ</th>
              <th className="p-4 md:p-5 font-black text-sm text-ludn-muted whitespace-nowrap">بيانات التواصل</th>
              <th className="p-4 md:p-5 font-black text-sm text-ludn-muted w-1/2 min-w-[300px]">نص الرسالة</th>
              <th className="p-4 md:p-5 font-black text-sm text-ludn-muted text-center whitespace-nowrap">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg: any) => (
              <tr key={msg.id} className="border-b border-ludn-line hover:bg-ludn-surface-2/60 transition-colors">
                <td className="p-4 md:p-5 align-top">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-ludn-surface-2 text-ludn-gold-text grid place-items-center">
                      <User size={18} />
                    </span>
                    <div>
                      <div className="font-black">{msg.name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-ludn-muted mt-1.5">
                        <Calendar size={12} />
                        {formatDate(msg.created_at)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 md:p-5 align-top">
                  <div className="flex flex-col gap-3">
                    {msg.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="shrink-0 text-ludn-gold-text" />
                        <span dir="ltr" className="text-sm font-bold">{msg.phone}</span>
                        <span className="me-auto">{whatsAppButton(msg.phone, true)}</span>
                      </div>
                    )}
                    {msg.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={15} className="shrink-0 text-ludn-gold-text" />
                        <span className="break-all text-sm font-bold">{msg.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 md:p-5 align-top">
                  <div className="rounded-xl bg-ludn-surface-2 p-4">
                    <p className="text-sm font-semibold text-ludn-fg/90 whitespace-pre-wrap leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </td>
                <td className="p-4 md:p-5 align-middle text-center">
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className={`${ICON_BTN_DANGER} inline-grid`}
                    title="حذف الرسالة"
                    aria-label="حذف الرسالة"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
