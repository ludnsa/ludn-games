-- ============================================================================
-- الوضع قبل 0019_mafia_deadline_at_write.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
--   1 table      جدول mafia_rooms موجود (المتوقع: exists)
--   2 columns    عمودين phase_ends_at و updated_at (المتوقع: timestamp with time zone)
--   3 triggers   الـ triggers على الجدول (المتوقع: mafia_rooms_set_updated_at بس)
--   4 updated_at دالة mafia_set_updated_at تكتب updated_at = now() (المتوقع: yes)
--   5 function   اسم الدالة الجديدة mafia_rooms_deadline_at_write (المتوقع: free — مو موجودة للحين)
--   6 rows       عدد غرف المافيا (للعلم — الملف ما يلمس الصفوف)
-- ============================================================================

select '1 table' as section, 'mafia_rooms' as name,
       case when to_regclass('public.mafia_rooms') is null then 'MISSING' else 'exists' end as detail
union all
select '2 columns', c.column_name, c.data_type || ' nullable=' || c.is_nullable || ' default=' || coalesce(c.column_default, 'none')
  from information_schema.columns c
 where c.table_schema = 'public' and c.table_name = 'mafia_rooms' and c.column_name in ('phase_ends_at', 'updated_at')
union all
select '3 triggers', 'mafia_rooms',
       coalesce((select string_agg(tg.tgname || ' -> ' || p.proname, ', ' order by tg.tgname)
                   from pg_trigger tg join pg_proc p on p.oid = tg.tgfoid
                  where tg.tgrelid = to_regclass('public.mafia_rooms') and not tg.tgisinternal),
                'none')
union all
select '4 updated_at', 'mafia_set_updated_at',
       coalesce((select case when p.prosrc ilike '%updated_at%now()%' then 'yes' else 'other: ' || left(p.prosrc, 120) end
                   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'mafia_set_updated_at'),
                'MISSING')
union all
select '5 function', 'mafia_rooms_deadline_at_write',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'mafia_rooms_deadline_at_write')
            then 'exists' else 'free' end
union all
select '6 rows', 'mafia_rooms', (select count(*)::text from public.mafia_rooms)
order by 1, 2;
