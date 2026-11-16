-- ============================================================================
-- فحص بعد 0017_timer_ends_at.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (check, name, result, ok). كل الصفوف لازم ok = true. انسخه كامل وأرسله.
--
--   column        العمود موجود: timestamptz، يقبل null، بدون قيمة افتراضية
--   publication   الجدول لسا في البث اللحظي، وبدون قائمة أعمدة (فالعمود يوصل مع التحديثات)
--   anon_select   الجوالات بدون حساب تقدر تقرا العمود (جوالات فرق المزاد وشاشة الجمهور)
--   auth_write    الحكم/المنشئ (حساب) يقدر يكتب العمود (المزاد: تعديل، السيطرة: إضافة وتعديل)
--   rows          عدد الصفوف نفسه قبل (من 0017_status) — ما انحذف شي
-- ============================================================================

with t(name) as (values ('auction_rooms'), ('wd_rooms'))
select 'column' as "check", t.name,
       coalesce((select c.data_type || ' nullable=' || c.is_nullable || ' default=' || coalesce(c.column_default, 'none')
                   from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = t.name and c.column_name = 'timer_ends_at'),
                'MISSING') as result,
       exists (select 1 from information_schema.columns c
                where c.table_schema = 'public' and c.table_name = t.name and c.column_name = 'timer_ends_at'
                  and c.data_type = 'timestamp with time zone' and c.is_nullable = 'YES' and c.column_default is null) as ok
  from t
union all
select 'publication', t.name,
       coalesce((select 'in supabase_realtime' || coalesce(' cols=' || (to_jsonb(pt) ->> 'attnames'), '')
                   from pg_publication_tables pt
                  where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = t.name),
                'NOT in supabase_realtime'),
       exists (select 1 from pg_publication_tables pt
                where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = t.name
                  and (to_jsonb(pt) -> 'attnames' is null
                       or (to_jsonb(pt) -> 'attnames') ? 'timer_ends_at'))
  from t
union all
select 'anon_select', t.name,
       has_column_privilege('anon', 'public.' || t.name, 'timer_ends_at', 'SELECT')::text,
       has_column_privilege('anon', 'public.' || t.name, 'timer_ends_at', 'SELECT')
  from t
union all
select 'auth_write', t.name,
       'update=' || has_column_privilege('authenticated', 'public.' || t.name, 'timer_ends_at', 'UPDATE')::text
         || ' insert=' || has_column_privilege('authenticated', 'public.' || t.name, 'timer_ends_at', 'INSERT')::text,
       has_column_privilege('authenticated', 'public.' || t.name, 'timer_ends_at', 'UPDATE')
         and (t.name <> 'wd_rooms' or has_column_privilege('authenticated', 'public.' || t.name, 'timer_ends_at', 'INSERT'))
  from t
union all
select 'rows', 'auction_rooms', (select count(*)::text from public.auction_rooms), true
union all
select 'rows', 'wd_rooms', (select count(*)::text from public.wd_rooms), true
order by 1, 2;
