-- =====================================================================
-- التراجع عن 0014_letters_hive_rooms.sql
-- يشيل غرف خلية الحروف الأونلاين كاملة: الجدولين، والبث اللحظي، ودالة updated_at.
-- ما يلمس ولا جدول ثاني.
--
-- ⚠️ ينحذف معه كل اللي في الجدولين (غرف الجلسات الشغالة وأصحابها). ما فيه شي ثاني
--    يضيع: النتائج ما تنحفظ بعد الجلسة أصلاً، والتجربة المجانية محسوبة في user_games.
--    كود اللعبة (بعد ما ينرفع) يتعامل مع غياب الجدول: يكمل على نفس الجهاز بس
--    (شاشة العرض من نفس المتصفح مثل قبل)، والباركود ما يطلع.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك 3 صفوف كلها "removed".
-- =====================================================================

begin;

-- 1) البث اللحظي (قبل حذف الجدول)
do $$
begin
  if exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hive_rooms'
  ) then
    alter publication supabase_realtime drop table public.hive_rooms;
  end if;
end $$;

-- 2) الجداول (أصحاب الغرف أول لأنه يشير للغرف). السياسات والـ trigger تنحذف معها.
drop table if exists public.hive_room_hosts;
drop table if exists public.hive_rooms;

-- 3) الدالة
drop function if exists public.hive_rooms_set_updated_at();

commit;

-- التأكد: الثلاثة "removed"
select 'hive_rooms' as item,
       case when to_regclass('public.hive_rooms') is null then 'removed' else 'STILL THERE' end as status
union all
select 'hive_room_hosts',
       case when to_regclass('public.hive_room_hosts') is null then 'removed' else 'STILL THERE' end
union all
select 'hive_rooms_set_updated_at()',
       case when to_regprocedure('public.hive_rooms_set_updated_at()') is null then 'removed' else 'STILL THERE' end;
