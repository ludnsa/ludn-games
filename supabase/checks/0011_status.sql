-- ============================================================================
-- وضع الحماية للجداول اللي تقفلها 0011، ومعها profiles. قراءة بس، ما يغيّر شي.
--
-- شغّله مرتين:
--   1) قبل 0011_lock_server_only_tables.sql، واحفظ النتيجة. هي "الوضع قبل"،
--      ومنها نتأكد إن ملف التراجع يرجّع نفس الصلاحيات بالضبط.
--   2) بعد 0011، عشان تقارن.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام:
--   1 rls       الحماية مفعّلة ولا لا
--   2 policy    القواعد الموجودة
--   3 grant     صلاحيات الجدول لـ anon و authenticated و service_role و PUBLIC
--   4 column    صلاحيات الأعمدة في profiles (الكتابة)
--   5 trigger   أي trigger على الجداول الثلاثة
--   6 function  أي دالة في القاعدة تذكر الجداول الثلاثة. لو وحدة منها
--               "security invoker" وتنادى من المتصفح، تتعطل بعد القفل، فلازم نشوفها قبل
-- ============================================================================

with t(name) as (
  values ('user_games'), ('transactions'), ('quiz_session_questions'), ('profiles')
)
select '1 rls' as section,
       c.relname::text as name,
       case when c.relrowsecurity then 'enabled' else 'DISABLED' end as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in (select name from t)

union all
select '2 policy',
       p.tablename || ' / ' || p.policyname,
       p.cmd || ' roles=' || array_to_string(p.roles, ',')
             || ' using=' || coalesce(p.qual, '-')
             || ' check=' || coalesce(p.with_check, '-')
  from pg_policies p
 where p.schemaname = 'public' and p.tablename in (select name from t)

union all
select '3 grant',
       g.table_name || ' / ' || g.grantee,
       string_agg(g.privilege_type, ', ' order by g.privilege_type)
  from information_schema.role_table_grants g
 where g.table_schema = 'public'
   and g.table_name in (select name from t)
   and g.grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
 group by g.table_name, g.grantee

union all
select '4 column',
       cp.table_name || ' / ' || cp.grantee,
       string_agg(cp.privilege_type || ':' || cp.column_name, ', ' order by cp.privilege_type, cp.column_name)
  from information_schema.column_privileges cp
 where cp.table_schema = 'public'
   and cp.table_name = 'profiles'
   and cp.grantee in ('anon', 'authenticated')
   and cp.privilege_type in ('INSERT', 'UPDATE')
 group by cp.table_name, cp.grantee

union all
select '5 trigger',
       tr.event_object_table || ' / ' || tr.trigger_name,
       tr.action_timing || ' ' || tr.event_manipulation
  from information_schema.triggers tr
 where tr.event_object_schema = 'public'
   and tr.event_object_table in ('user_games', 'transactions', 'quiz_session_questions')

union all
select '6 function',
       fn.nspname || '.' || pr.proname,
       case when pr.prosecdef then 'security definer' else 'security invoker' end
  from pg_proc pr
  join pg_namespace fn on fn.oid = pr.pronamespace
 where fn.nspname in ('public', 'auth')
   and (pr.prosrc ilike '%user_games%'
        or pr.prosrc ilike '%transactions%'
        or pr.prosrc ilike '%quiz_session_questions%')

order by 1, 2;
