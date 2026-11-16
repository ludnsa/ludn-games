-- ============================================================================
-- الوضع قبل 0017_timer_ends_at.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام (لكل جدول من الاثنين: auction_rooms و wd_rooms):
--   1 table        الجدول موجود (المتوقع: exists)
--   2 column       عمود timer_ends_at (المتوقع: free — يعني مو موجود للحين)
--   3 publication  الجدول في البث اللحظي supabase_realtime، وهل عليه قائمة أعمدة
--                  (المتوقع: in supabase_realtime بدون cols — العمود الجديد يوصل بالبث لحاله)
--   4 grants       صلاحيات anon و authenticated على الجدول كامل
--                  (المتوقع: فيها SELECT و INSERT و UPDATE — العمود الجديد ياخذها لحاله)
--   5 col_grants   صلاحيات على أعمدة معيّنة بس (المتوقع: none — لو فيه، العمود الجديد يحتاج صلاحية)
--   6 rls          RLS مفعّل؟ (0017 ما يغيّره)
--   7 policies     قواعد RLS على الجدول (0017 ما يلمسها، والعمود الجديد يمشي عليها مثل باقي الأعمدة)
--   8 triggers     الـ triggers على الجدول (للعلم)
--   9 rows         عدد الصفوف (إضافة عمود فاضي بدون قيمة افتراضية لحظية، ما تعيد كتابة الجدول)
-- ============================================================================

with t(name) as (values ('auction_rooms'), ('wd_rooms'))
select '1 table' as section, t.name,
       case when to_regclass('public.' || t.name) is null then 'MISSING' else 'exists' end as detail
  from t
union all
select '2 column', t.name,
       coalesce((select c.data_type || ' nullable=' || c.is_nullable || ' default=' || coalesce(c.column_default, 'none')
                   from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = t.name and c.column_name = 'timer_ends_at'),
                'free')
  from t
union all
select '3 publication', t.name,
       coalesce((select 'in supabase_realtime' || coalesce(' cols=' || (to_jsonb(pt) ->> 'attnames'), '')
                   from pg_publication_tables pt
                  where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = t.name),
                'NOT in supabase_realtime')
  from t
union all
select '4 grants', t.name,
       coalesce((select string_agg(g.grantee || ':' || g.privilege_type, ', ' order by g.grantee, g.privilege_type)
                   from information_schema.role_table_grants g
                  where g.table_schema = 'public' and g.table_name = t.name and g.grantee in ('anon', 'authenticated')),
                'NONE')
  from t
union all
select '5 col_grants', t.name,
       coalesce((select string_agg(distinct cp.grantee || ':' || cp.privilege_type, ', ')
                   from information_schema.column_privileges cp
                  where cp.table_schema = 'public' and cp.table_name = t.name and cp.grantee in ('anon', 'authenticated')
                    and not exists (select 1 from information_schema.role_table_grants g
                                     where g.table_schema = 'public' and g.table_name = t.name
                                       and g.grantee = cp.grantee and g.privilege_type = cp.privilege_type)),
                'none')
  from t
union all
select '6 rls', t.name,
       (select case when c.relrowsecurity then 'on' else 'off' end from pg_class c where c.oid = to_regclass('public.' || t.name))
  from t
union all
select '7 policies', t.name,
       coalesce((select string_agg(p.policyname || ':' || p.cmd || ':' || array_to_string(p.roles::text[], '+'), ', ' order by p.policyname)
                   from pg_policies p
                  where p.schemaname = 'public' and p.tablename = t.name),
                'none')
  from t
union all
select '8 triggers', t.name,
       coalesce((select string_agg(tg.tgname, ', ' order by tg.tgname)
                   from pg_trigger tg
                  where tg.tgrelid = to_regclass('public.' || t.name) and not tg.tgisinternal),
                'none')
  from t
union all
select '9 rows', 'auction_rooms', (select count(*)::text from public.auction_rooms)
union all
select '9 rows', 'wd_rooms', (select count(*)::text from public.wd_rooms)
order by 1, 2;
