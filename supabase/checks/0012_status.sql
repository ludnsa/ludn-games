-- ============================================================================
-- وضع الحماية للجداول اللي تعدّلها 0012. قراءة بس، ما يغيّر شي.
--
-- شغّله مرتين:
--   1) قبل 0012_lock_content_tables.sql، وأرسل النتيجة ("الوضع قبل").
--   2) بعد 0012، عشان تقارن.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام:
--   1 rls       الحماية مفعّلة ولا لا، ومالك الجدول
--   2 policy    القواعد الموجودة
--   3 grant     صلاحيات الجدول لـ anon و authenticated و service_role و PUBLIC
--   4 colgrant  صلاحيات على أعمدة محددة (مثل اسم وجوال profiles)
--   5 function  الدوال اللي تذكر جدول الرسائل أو البنوك، وهل تشتغل بصلاحية مالكها
--               (security definer) ولا بصلاحية اللي يناديها (security invoker)
--   6 trigger   أي trigger على الجداول
--   7 admin     عدد الأدمن حسب app_metadata.role (نفس شرط الموقع والقواعد الجديدة)
--   8 backup    هل نسخة الوضع قبل (security_backup_0012) موجودة، يعني 0012 انشغّل قبل
-- ============================================================================

with t(name) as (
  values ('aw_questions'), ('cw_questions'), ('wd_country_questions'), ('wd_countries'), ('wd_challenges'),
         ('quiz_questions'), ('quiz_categories'), ('aw_settings'), ('cw_settings'), ('wd_settings'),
         ('contact_messages'), ('user_games'), ('transactions'), ('profiles')
)
select '1 rls' as section,
       c.relname::text as name,
       case when c.relrowsecurity then 'enabled' else 'DISABLED' end || ' owner=' || pg_get_userbyid(c.relowner) as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in (select name from t)

union all
select '2 policy',
       p.tablename || ' / ' || p.policyname,
       p.permissive || ' ' || p.cmd || ' roles=' || array_to_string(p.roles, ',')
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
select '4 colgrant',
       c.relname || ' / ' || case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
       string_agg(a.privilege_type || ':' || att.attname, ', ' order by a.privilege_type, att.attname)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute att on att.attrelid = c.oid and att.attnum > 0 and not att.attisdropped and att.attacl is not null
  cross join lateral aclexplode(att.attacl) a
 where n.nspname = 'public' and c.relname in (select name from t)
   and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
 group by c.relname, a.grantee

union all
select '5 function',
       pr.oid::regprocedure::text,
       case when pr.prosecdef then 'security definer' else 'security invoker' end
         || ' config=' || coalesce(array_to_string(pr.proconfig, ' | '), '-')
  from pg_proc pr
  join pg_namespace fn on fn.oid = pr.pronamespace
 where fn.nspname = 'public'
   and (pr.proname = 'check_recent_message'
        or pr.prosrc ilike '%contact_messages%'
        or pr.prosrc ilike '%aw_questions%' or pr.prosrc ilike '%cw_questions%'
        or pr.prosrc ilike '%wd_country_questions%' or pr.prosrc ilike '%wd_countries%'
        or pr.prosrc ilike '%wd_challenges%' or pr.prosrc ilike '%quiz_questions%'
        or pr.prosrc ilike '%quiz_categories%' or pr.prosrc ilike '%_settings%')

union all
select '6 trigger',
       tr.event_object_table || ' / ' || tr.trigger_name,
       tr.action_timing || ' ' || tr.event_manipulation
  from information_schema.triggers tr
 where tr.event_object_schema = 'public'
   and tr.event_object_table in (select name from t)

union all
select '7 admin',
       'app_metadata.role = admin',
       count(*)::text || ' user(s): ' || coalesce(string_agg(left(u.id::text, 8), ', '), '-')
  from auth.users u
 where u.raw_app_meta_data ->> 'role' = 'admin'

union all
select '8 backup',
       'security_backup_0012',
       case when to_regclass('public.security_backup_0012') is null then 'not created (0012 not run yet)'
            else 'exists' end

order by 1, 2;
