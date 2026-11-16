-- =====================================================================
-- التراجع عن 0019_mafia_deadline_at_write.sql: يشيل الـ trigger والدالة.
--
-- بعده: الموعد يرجع ينكتب مثل ما يحسبه السيرفر (مثل قبل 0019). الكود الجديد يمشي عادي
-- (updated_at اللي يرسله ينكتب فوقه now() من الـ trigger القديم)، فما يحتاج ترجع الكود قبله.
-- ما يحذف أي بيانات، وما يلمس الـ trigger القديم (mafia_rooms_set_updated_at).
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- =====================================================================

begin;

set local lock_timeout = '5s';

drop trigger if exists mafia_rooms_deadline_at_write on public.mafia_rooms;
drop function if exists public.mafia_rooms_deadline_at_write();

commit;

-- تأكيد: المتوقع صف واحد بس: mafia_rooms_set_updated_at
select tg.tgname as trigger_name
  from pg_trigger tg
 where tg.tgrelid = 'public.mafia_rooms'::regclass
   and not tg.tgisinternal
 order by tg.tgname;
