"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Users, Trash2, Edit, Save, X, Loader2, Key, Search, Zap, CalendarClock } from "lucide-react";
import { getAdminUsers, deleteAdminUser, updateAdminUser, setAdminSubscription } from "@/app/actions/admin-users";
import { formatPlanDate, isSubscriptionActive, subscriptionDaysLeft } from "@/lib/packages";
import {
  PANEL, PANEL_TITLE, TITLE_ICON, FIELD, ICON_BTN, ICON_BTN_DANGER, BTN_SM_GOLD, BTN_SM_SOFT, SPINNER,
} from "@/components/admin/layout/adminUi";

type AdminUser = {
  id: string;
  email: string;
  phone: string;
  name: string;
  createdAt: string;
  tokens: number;
  subscriptionEndsAt: string | null;
};

const EDIT_LABEL = "block text-xs font-bold text-ludn-muted mb-1.5";

/** أزرار الاشتراك اليدوي بلوحة التحكم: تتمدد من نهاية الاشتراك الحالي */
const SUB_GRANTS = [
  { days: 30, label: "+ شهر" },
  { days: 90, label: "+ 3 شهور" },
  { days: 365, label: "+ سنة" },
];

export default function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTokens, setEditTokens] = useState<number>(0);
  const [editPassword, setEditPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [subBusy, setSubBusy] = useState(false);

  // الاشتراك ينحفظ على طول (مو مع زر الحفظ)
  const changeSubscription = async (userId: string, days: number) => {
    if (days === 0 && !confirm("متأكد تبي تلغي اشتراك هذا المستخدم؟")) return;
    setSubBusy(true);
    try {
      const res = await setAdminSubscription(userId, days);
      if (res.success) {
        setUsers((list) => list.map((u) => (u.id === userId ? { ...u, subscriptionEndsAt: res.endsAt } : u)));
      } else {
        alert("فشل: " + res.error);
      }
    } finally {
      setSubBusy(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminUsers();
      if (res.error) {
        setError(res.error);
      } else if (res.users) {
        setUsers(res.users);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف المستخدم "${userName}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء!`)) return;

    try {
      const res = await deleteAdminUser(userId);
      if (res.success) {
        setUsers(users.filter((u) => u.id !== userId));
      } else {
        alert("فشل الحذف: " + res.error);
      }
    } catch (err) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditTokens(user.tokens || 0);
    setEditPassword(""); // Blank password implies no change
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    setIsSaving(true);
    try {
      const res = await updateAdminUser(editingUserId, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        password: editPassword,
        tokens: editTokens,
      });

      if (res.success) {
        setUsers(users.map(u => u.id === editingUserId ? { ...u, name: editName, email: editEmail, phone: editPhone, tokens: editTokens } : u));
        setEditingUserId(null);
      } else {
        alert("فشل التحديث: " + res.error);
      }
    } catch (err) {
      alert("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      (user.name && user.name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.phone && user.phone.includes(query))
    );
  }, [users, searchQuery]);

  const formatJoined = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const editingUser = users.find((u) => u.id === editingUserId) ?? null;
  const editingActive = isSubscriptionActive(editingUser?.subscriptionEndsAt);

  // نموذج التعديل: نفسه بالجدول (الكمبيوتر) وبالبطاقة (الجوال)
  const renderEditForm = () => (
    <div className="rounded-2xl bg-ludn-surface-2 border border-ludn-gold/40 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 grid gap-3 rounded-2xl bg-ludn-surface border border-ludn-line p-4">
        <p className="text-sm font-black text-ludn-gold-text flex items-center gap-2">
          <CalendarClock size={16} />
          الاشتراك
          <span className="font-bold text-ludn-muted">
            {editingActive && editingUser?.subscriptionEndsAt
              ? `فعّال لين ${formatPlanDate(editingUser.subscriptionEndsAt)} (باقي ${subscriptionDaysLeft(editingUser.subscriptionEndsAt)} يوم)`
              : "ما عنده اشتراك"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SUB_GRANTS.map((g) => (
            <button
              key={g.days}
              type="button"
              disabled={subBusy || !editingUserId}
              onClick={() => editingUserId && changeSubscription(editingUserId, g.days)}
              className={BTN_SM_SOFT}
            >
              {g.label}
            </button>
          ))}
          {editingActive && (
            <button
              type="button"
              disabled={subBusy || !editingUserId}
              onClick={() => editingUserId && changeSubscription(editingUserId, 0)}
              className={`${BTN_SM_SOFT} text-rose-500`}
            >
              إلغاء الاشتراك
            </button>
          )}
          {subBusy && <Loader2 size={18} className="animate-spin self-center text-ludn-muted" />}
        </div>
        <p className="text-xs font-bold text-ludn-muted">ينحفظ على طول، ويتمدد من نهاية الاشتراك الحالي</p>
      </div>
      <div>
        <label className={EDIT_LABEL}>الإسم</label>
        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={FIELD} />
      </div>
      <div>
        <label className={EDIT_LABEL}>البريد الإلكتروني</label>
        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={FIELD} dir="ltr" />
      </div>
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-ludn-surface border border-ludn-line p-4">
        <div>
          <label className="text-sm font-black text-ludn-gold-text mb-2 flex items-center gap-2">
            <Edit size={16} />
            تعديل الرصيد يدوياً
          </label>
          <input type="number" min="0" value={editTokens} onChange={(e) => setEditTokens(parseInt(e.target.value) || 0)} className={`${FIELD} font-black text-lg`} />
        </div>
        <div>
          <label className="text-sm font-black text-ludn-green mb-2 flex items-center gap-2">
            <Zap size={16} />
            إضافة ألعاب سريعة (تزيد على الرصيد)
          </label>
          <div className="relative">
            <select
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0) {
                  setEditTokens(prev => prev + val);
                  e.target.value = "0"; // reset
                }
              }}
              className="w-full min-h-12 px-3.5 bg-ludn-green text-white border-none rounded-xl outline-none font-black text-base cursor-pointer appearance-none"
            >
              <option value="0" className="bg-slate-800 text-white">اختر عدد الألعاب...</option>
              <option value="1" className="bg-slate-800 text-white">+ لعبة واحدة</option>
              <option value="3" className="bg-slate-800 text-white">+ 3 ألعاب</option>
              <option value="6" className="bg-slate-800 text-white">+ 6 ألعاب</option>
              <option value="10" className="bg-slate-800 text-white">+ 10 ألعاب</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-white">
              <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label className={EDIT_LABEL}>رقم الجوال</label>
        <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={FIELD} dir="ltr" />
      </div>
      <div>
        <label className={`${EDIT_LABEL} flex items-center gap-1`}><Key size={12}/> كلمة المرور (اتركه فارغاً إذا لم ترغب بتغييره)</label>
        <input type="text" placeholder="كلمة المرور الجديدة" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className={FIELD} />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2">
        <button onClick={cancelEdit} className={BTN_SM_SOFT}>
          <X size={16} /> إلغاء
        </button>
        <button onClick={saveEdit} disabled={isSaving} className={BTN_SM_GOLD}>
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ
        </button>
      </div>
    </div>
  );

  const renderActions = (user: AdminUser) => (
    <>
      <button onClick={() => startEdit(user)} className={ICON_BTN} title="تعديل المستخدم" aria-label="تعديل المستخدم">
        <Edit size={16} />
      </button>
      <button onClick={() => handleDelete(user.id, user.name)} className={ICON_BTN_DANGER} title="حذف المستخدم" aria-label="حذف المستخدم">
        <Trash2 size={16} />
      </button>
    </>
  );

  const tokensBadge = (user: AdminUser) => (
    <span className="inline-block bg-ludn-green/15 text-ludn-green font-black px-3 py-1 rounded-full border border-ludn-green/30 tabular-nums">
      {user.tokens || 0}
    </span>
  );

  const subscriptionBadge = (user: AdminUser) =>
    isSubscriptionActive(user.subscriptionEndsAt) && user.subscriptionEndsAt ? (
      <span className="inline-block bg-ludn-gold/15 text-ludn-gold-text font-black text-xs px-3 py-1 rounded-full border border-ludn-gold/30 whitespace-nowrap">
        لين {formatPlanDate(user.subscriptionEndsAt)}
      </span>
    ) : (
      <span className="text-ludn-muted">—</span>
    );

  if (loading) {
    return (
      <div className={`${PANEL} flex items-center justify-center min-h-[300px]`}>
        <div className={`${SPINNER} w-10 h-10`} />
      </div>
    );
  }

  const emptyText = searchQuery ? "لا توجد نتائج مطابقة للبحث." : "لا يوجد مستخدمين مسجلين بعد.";

  return (
    <div className={`${PANEL} flex flex-col gap-5`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className={PANEL_TITLE}>
            <span className={TITLE_ICON}><Users size={20} /></span>
            إدارة المستخدمين المسجلين
          </h2>
          <span className="bg-ludn-surface-2 px-3 py-1 rounded-full text-sm font-bold text-ludn-muted">
            العدد: {filteredUsers.length} {searchQuery && `من أصل ${users.length}`}
          </span>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="البحث بالإسم، الإيميل، أو رقم الجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${FIELD} ps-10`}
          />
          <Search size={17} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ludn-muted pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 text-rose-500 p-4 rounded-xl text-sm font-bold border border-rose-500/25">
          {error}
        </div>
      )}

      {/* الجوال: بطاقات */}
      <ul className="md:hidden grid gap-3">
        {filteredUsers.map((user) => (
          <li key={user.id} className="rounded-2xl bg-ludn-surface-2 border border-ludn-line p-3.5">
            {editingUserId === user.id ? (
              renderEditForm()
            ) : (
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black truncate">{user.name}</p>
                    <p className="text-sm text-ludn-muted break-all" dir="ltr">{user.email || "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {tokensBadge(user)}
                    {subscriptionBadge(user)}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-ludn-muted">
                  <span dir="ltr">{user.phone || "—"}</span>
                  <span dir="ltr">{formatJoined(user.createdAt)}</span>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-ludn-line">{renderActions(user)}</div>
              </div>
            )}
          </li>
        ))}
        {filteredUsers.length === 0 && <li className="py-12 text-center text-ludn-muted font-bold">{emptyText}</li>}
      </ul>

      {/* الكمبيوتر: جدول */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[920px]">
          <thead>
            <tr className="border-b border-ludn-line">
              <th className="py-3 px-4 text-sm font-black text-ludn-muted">الإسم</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted">البريد الإلكتروني</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">رصيد الألعاب</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">الاشتراك</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted">رقم الجوال</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">تاريخ التسجيل</th>
              <th className="py-3 px-4 text-sm font-black text-ludn-muted text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-ludn-line hover:bg-ludn-surface-2/60 transition-colors">

                {editingUserId === user.id ? (
                  <td colSpan={7} className="py-4 px-4">
                    {renderEditForm()}
                  </td>
                ) : (
                  <>
                    <td className="py-4 px-4 font-bold">{user.name}</td>
                    <td className="py-4 px-4 text-ludn-muted" dir="ltr">{user.email || "—"}</td>
                    <td className="py-4 px-4 text-center">{tokensBadge(user)}</td>
                    <td className="py-4 px-4 text-center">{subscriptionBadge(user)}</td>
                    <td className="py-4 px-4 text-ludn-muted" dir="ltr">{user.phone || "—"}</td>
                    <td className="py-4 px-4 text-ludn-muted text-sm text-center" dir="ltr">
                      {formatJoined(user.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">{renderActions(user)}</div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-ludn-muted font-bold">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
