-- =====================================================================
-- 0019_mafia_deadline_at_write.sql
-- المافيا: موعد نهاية المرحلة ينحسب لحظة الكتابة بالقاعدة نفسها.
--
-- المشكلة: السيرفر يحسب الموعد (الحين + مدة المرحلة) وبعدها يرسل الكتابة. لو تأخرت الكتابة
-- بالطريق (مثل الـ 13 ثانية بالجولة 6)، تنكتب المرحلة وموعدها ناقص أو خالص: التصويت يوصل
-- الجوالات وهو منتهي، والأصوات تنرفض.
--
-- الحل: السيرفر يرسل مع الموعد لحظة حسابه (بعمود updated_at اللي موجود أصلاً).
-- هالـ trigger يطلع المدة (الموعد − لحظة الحساب) ويكتب الموعد = لحظة الكتابة (now()) + نفس المدة.
-- فكل مرحلة تاخذ وقتها كامل من لحظة ما تنكتب، حتى لو تأخرت الكتابة.
-- بعده يشتغل trigger التحديث القديم (mafia_rooms_set_updated_at) ويكتب updated_at = now() مثل قبل.
--
-- الترتيب: Postgres يشغّل triggers نفس الحدث بترتيب أسمائها أبجدياً:
--   mafia_rooms_deadline_at_write (d)  قبل  mafia_rooms_set_updated_at (s)
--   فهالـ trigger يقرا لحظة الحساب قبل ما تنكتب updated_at فوقها. (الفحص بعد التشغيل يتأكد.)
--
-- ما يتغير شي غير كذا:
--   - كتابة ما فيها updated_at، أو ما غيّرت الموعد، أو موعدها فاضي: تنكتب مثل ما هي.
--   - مدة غريبة (صفر أو سالبة أو أكثر من ساعة): الموعد ينكتب مثل ما وصل.
--   - ما فيه عمود جديد، وما تتغير الصلاحيات ولا RLS ولا البث اللحظي. ما ينحذف شي.
--
-- آمن بأي ترتيب مع الكود:
--   - الكود الجديد قبل هالملف: updated_at اللي يرسله ينكتب فوقه now() (الـ trigger القديم)، والموعد مثل اليوم.
--   - هالملف قبل الكود الجديد: الكود القديم ما يرسل updated_at، فما يتغير شي.
--
-- الأمان: lock_timeout 5 ثواني (لو الجدول مشغول، الملف يوقف بخطأ بدل ما يعلّق اللعب وما يتغير شي).
--         قابل لإعادة التشغيل.
--
-- قبل التشغيل: supabase/checks/0019_status.sql وأرسل نتيجته.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run. آخر استعلام يطلع الـ triggers بترتيبها.
-- بعد التشغيل: supabase/checks/0019_mafia_deadline_at_write_check.sql
-- التراجع: supabase/rollback/0019_mafia_deadline_at_write_rollback.sql
-- =====================================================================

begin;

set local lock_timeout = '5s';

create or replace function public.mafia_rooms_deadline_at_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  dur interval;
begin
  -- السيرفر أرسل موعد جديد ومعه لحظة حسابه (updated_at)
  if new.phase_ends_at is not null
     and new.phase_ends_at is distinct from old.phase_ends_at
     and new.updated_at is distinct from old.updated_at then
    dur := new.phase_ends_at - new.updated_at;
    if dur > interval '0 seconds' and dur <= interval '1 hour' then
      new.phase_ends_at := now() + dur;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.mafia_rooms_deadline_at_write() is
  'المافيا: موعد نهاية المرحلة = لحظة الكتابة + المدة (المدة = الموعد − لحظة حسابه بالسيرفر، تجي بعمود updated_at)';

drop trigger if exists mafia_rooms_deadline_at_write on public.mafia_rooms;
create trigger mafia_rooms_deadline_at_write
  before update on public.mafia_rooms
  for each row execute function public.mafia_rooms_deadline_at_write();

commit;

-- تأكيد: الـ triggers على mafia_rooms بترتيب تشغيلها.
-- المتوقع: mafia_rooms_deadline_at_write أول، بعده mafia_rooms_set_updated_at
select tg.tgname as trigger_name,
       p.proname as function_name,
       case tg.tgenabled when 'O' then 'enabled' when 'D' then 'DISABLED' else tg.tgenabled::text end as state
  from pg_trigger tg
  join pg_proc p on p.oid = tg.tgfoid
 where tg.tgrelid = 'public.mafia_rooms'::regclass
   and not tg.tgisinternal
 order by tg.tgname;
