-- =====================================================================
-- التراجع عن 0017_timer_ends_at.sql: يحذف عمود timer_ends_at من الجدولين.
--
-- مهم — الترتيب:
--   1) ارجع للكود قبل التعديل أولاً (أو اتأكد إن الكود المنشور يكتب بدون العمود).
--      الكود الجديد لو لقى العمود ناقص يكتب بدونه، فاللعب ما يتعطل، بس جوالات الفرق
--      وشاشة الجمهور تعرض رقم المؤقت بدون عد.
--   2) بعدها شغّل هذا الملف.
--
-- ما يحذف أي بيانات ثانية: العمود فيه وقت انتهاء المؤقت الشغال بس (بيانات مؤقتة).
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- =====================================================================

begin;

set local lock_timeout = '5s';

alter table public.auction_rooms drop column if exists timer_ends_at;
alter table public.wd_rooms drop column if exists timer_ends_at;

commit;

-- تأكيد: المتوقع ولا صف (العمود راح من الجدولين)
select c.table_name, c.column_name
  from information_schema.columns c
 where c.table_schema = 'public'
   and c.table_name in ('auction_rooms', 'wd_rooms')
   and c.column_name = 'timer_ends_at';
