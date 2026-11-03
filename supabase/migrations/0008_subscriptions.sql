-- =====================================================================
-- 0008_subscriptions.sql
-- الاشتراكات: شهر / 3 شهور / سنة — مفتوح لكل الألعاب المدفوعة
--
-- 1) user_subscriptions: تاريخ انتهاء اشتراك كل مستخدم. مقفول على المتصفح
--    (RLS بدون أي سياسة) — السيرفر بس يقرأ ويكتب، فمحد يمدد اشتراكه بنفسه.
-- 2) extend_subscription: تمديد بخطوة وحدة — يبدأ من نهاية الاشتراك الحالي
--    (أو من الحين لو منتهي)، فاللي يجدد بدري ما يضيع عليه شي.
--    مقفولة على المتصفح، السيرفر بس (service_role).
-- 3) نفس الدفعة الناجحة ما تنحفظ مرتين (لو صفحة الدفع انفتحت مرتين).
--
-- الرصيد القديم (profiles.available_tokens) ما يتغير — يظل شغال لين يخلص.
--
-- طريقة التشغيل: انسخه والصقه في Supabase SQL Editor ثم شغّله.
-- قابل لإعادة التشغيل. لازم يتشغّل قبل رفع كود الاشتراكات.
-- =====================================================================

create table if not exists public.user_subscriptions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  ends_at    timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;
-- بدون أي سياسة = anon و authenticated ما يقرون ولا يكتبون (service_role بس)

create or replace function public.extend_subscription(p_user_id uuid, p_days integer)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  insert into public.user_subscriptions as s (user_id, ends_at, updated_at)
  values (p_user_id, now() + make_interval(days => p_days), now())
  on conflict (user_id) do update
    set ends_at    = greatest(s.ends_at, now()) + make_interval(days => p_days),
        updated_at = now()
  returning ends_at;
$$;

revoke all on function public.extend_subscription(uuid, integer) from public, anon, authenticated;
grant execute on function public.extend_subscription(uuid, integer) to service_role;

create unique index if not exists transactions_paid_payment_uidx
  on public.transactions (payment_id)
  where status = 'paid';
