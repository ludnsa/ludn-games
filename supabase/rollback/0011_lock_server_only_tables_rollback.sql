-- =====================================================================
-- التراجع عن 0011_lock_server_only_tables.sql
-- يرجّع الجداول الثلاثة للوضع اللي قبل: RLS مقفول، وصلاحيات anon و authenticated كاملة.
--
-- ⚠️ هذا يرجّع الثغرة نفسها (أي زائر يقرا ويعدّل ويحذف). شغّله بس لو شي انكسر
--    بعد 0011 (مثلاً بدء اللعب أو الدفع وقف)، وقل لي على طول عشان نصلّح السبب ونقفل من جديد.
--
-- الصلاحيات تحت هي الصلاحيات الافتراضية في Supabase (نفس اللي طلعت لجداول المزاد):
--   SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER لـ anon و authenticated.
-- قبل ما تشغّله: قارنها بقسم "3 grant" في نتيجة 0011_status.sql اللي حفظتها قبل 0011.
--   لو "الوضع قبل" كان مختلف (مثلاً فيه MAINTAIN، أو PUBLIC عنده صلاحيات)، قل لي أعدّل الملف.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك 3 صفوف للتأكد.
-- =====================================================================

begin;

alter table public.user_games             disable row level security;
alter table public.transactions           disable row level security;
alter table public.quiz_session_questions disable row level security;

grant select, insert, update, delete, truncate, references, trigger
  on table public.user_games             to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.transactions           to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.quiz_session_questions to anon, authenticated;

commit;

-- التأكد: rls_enabled = false، والصلاحيات رجعت مثل "الوضع قبل"
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'anon') as anon_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'authenticated') as authenticated_privs
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('user_games', 'transactions', 'quiz_session_questions')
 order by 1;
