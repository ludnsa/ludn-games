-- ============================================================================
-- الوضع قبل 0014_letters_hive_rooms.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام:
--   1 free        أسماء الجدولين والدالة فاضية (المتوقع: free للثلاثة)
--   2 realtime    البث اللحظي موجود، وكم جدول فيه الحين
--   3 auth        جدول الحسابات موجود (الغرفة تربط بحساب المقدم)
--   4 default     الصلاحيات اللي ياخذها أي جدول جديد تلقائياً (0014 يسحبها)
--   5 similar     أي جدول أو دالة اسمها يبدأ بـ hive (المتوقع: ولا شي)
-- ============================================================================

select '1 free' as section,
       x.name,
       case when x.found then 'TAKEN' else 'free' end as detail
  from (values
          ('public.hive_rooms', to_regclass('public.hive_rooms') is not null),
          ('public.hive_room_hosts', to_regclass('public.hive_room_hosts') is not null),
          ('public.hive_rooms_set_updated_at()', to_regprocedure('public.hive_rooms_set_updated_at()') is not null)
       ) as x(name, found)

union all
select '2 realtime',
       'supabase_realtime',
       case when exists (select 1 from pg_publication where pubname = 'supabase_realtime')
            then 'exists, tables: ' || (select count(*) from pg_publication_tables where pubname = 'supabase_realtime')::text
                 || ' (' || coalesce((select string_agg(tablename, ', ' order by tablename)
                                        from pg_publication_tables
                                       where pubname = 'supabase_realtime' and schemaname = 'public'), '-') || ')'
            else 'MISSING' end

union all
select '3 auth',
       'auth.users',
       case when to_regclass('auth.users') is not null then 'exists' else 'MISSING' end

union all
select '4 default',
       pg_get_userbyid(d.defaclrole) || ' -> new tables in ' || coalesce(n.nspname, '(all)'),
       array_to_string(d.defaclacl, ' ')
  from pg_default_acl d
  left join pg_namespace n on n.oid = d.defaclnamespace
 where d.defaclobjtype = 'r'
   and (n.nspname = 'public' or n.nspname is null)

union all
select '5 similar',
       c.relname::text,
       'table/view already exists'
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname like 'hive%'

union all
select '5 similar',
       p.proname::text,
       'function already exists'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname like 'hive%'

order by 1, 2;
