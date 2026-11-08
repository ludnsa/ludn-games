-- =====================================================================
-- 0011_lock_server_only_tables.sql
-- قفل 3 جداول ما يستخدمها إلا السيرفر بمفتاح الخدمة (service role):
--   user_games              الوصول للألعاب والتجربة المجانية
--   transactions            سجل الدفع
--   quiz_session_questions  أسئلة وإجابات جلسات تحدي الفئات
--
-- قبل: RLS مقفول، وصلاحيات anon و authenticated كاملة. يعني أي زائر بالمفتاح
--   العام (الموجود في كود الموقع) يقرا ويضيف ويعدّل ويحذف. مثلاً صف فيه
--   is_purchased = true يعطيه اللعبة مدى الحياة، و games_played = 0 يرجّع
--   له التجربة المجانية.
-- بعد: RLS مفعّل بدون أي سياسة، وصلاحيات anon و authenticated و PUBLIC مسحوبة.
--   مفتاح الخدمة يتخطى RLS وصلاحياته ما تتغير، وكل الكود اللي يلمس هالجداول يمر منه:
--     app/actions/gameAccess.ts   (فحص الوصول، وعدّاد اللعب، وألعاب المستخدم)
--     app/actions/payment.ts      (حفظ عملية الدفع)
--     app/actions/admin-users.ts  (صفحة المشتريات في الأدمن)
--     actions/quiz-grid.ts        (لوحة أسئلة تحدي الفئات)
--   ما فيه أي مكان في الكود يقرا أو يكتب فيها بجلسة المستخدم أو بالمفتاح العام.
--
-- قبل التشغيل: شغّل supabase/checks/0011_status.sql واحفظ نتيجته ("الوضع قبل").
--   لو قسم "6 function" طلع فيه دالة security invoker، وقّف وقل لي.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك 3 صفوف للتأكد.
-- بعد التشغيل: شغّل supabase/checks/0011_lock_server_only_tables_check.sql
--   (يجرب بأدوار حقيقية ويلغي كل تجاربه).
-- التراجع: supabase/rollback/0011_lock_server_only_tables_rollback.sql
-- =====================================================================

begin;

-- 1) الحماية: مفعّلة بدون أي سياسة للمتصفح
alter table public.user_games             enable row level security;
alter table public.transactions           enable row level security;
alter table public.quiz_session_questions enable row level security;

-- 2) سحب الصلاحيات من المتصفح (الزائر، والمستخدم المسجّل، والكل).
--    service_role ما ينلمس.
revoke all on table public.user_games             from anon, authenticated, public;
revoke all on table public.transactions           from anon, authenticated, public;
revoke all on table public.quiz_session_questions from anon, authenticated, public;

commit;

-- التأكد: rls_enabled = true، و anon_privs و authenticated_privs فاضية،
-- و service_role_privs فيها صلاحياته (SELECT, INSERT, UPDATE, DELETE على الأقل).
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'anon') as anon_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'authenticated') as authenticated_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'service_role') as service_role_privs
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('user_games', 'transactions', 'quiz_session_questions')
 order by 1;
