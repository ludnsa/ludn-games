-- =====================================================================
-- 0012_lock_content_tables.sql
-- الخطوة 2 من قفل القاعدة: بنوك الأسئلة والإعدادات والرسائل، وتنظيف قواعد قديمة.
--
-- 1) بنوك الأسئلة والإعدادات (10 جداول):
--      aw_questions, cw_questions, wd_country_questions, wd_countries, wd_challenges,
--      quiz_questions, quiz_categories, aw_settings, cw_settings, wd_settings
--    القراءة تبقى للكل مثل الحين (الألعاب تقراها من المتصفح).
--    الإضافة والتعديل والحذف للأدمن بس.
-- 2) contact_messages: الإرسال للكل مثل الحين، والقراءة والحذف للأدمن بس.
--    - قاعدة الإرسال القديمة (contact_messages_insert_valid) أشد من نموذج التواصل
--      (تطلب اسم من كلمتين بالضبط، وإيميل من 6 نطاقات بس، وأرقام إنجليزية في الجوال)،
--      ولو اشتغلت كانت بترفض رسائل سليمة. فنحط بدالها إرسال مفتوح مثل الحين.
--    - حذف الرسائل من صفحة الأدمن معطّل الحين، لأن authenticated ما عنده DELETE.
--      نعطيه DELETE، والقاعدة تحصرها في الأدمن.
--    - دالة فحص التكرار check_recent_message: لو كانت تشتغل بصلاحية المرسل، نخليها
--      تشتغل بصلاحية مالكها عشان تشوف الرسائل السابقة. في الإنتاج هي أصلاً كذا
--      (security definer، ومسارها public, extensions, auth)، فما تنلمس.
-- 3) نشيل 4 قواعد قديمة ما لها أثر الحين، بس خطيرة لو رجعت الصلاحيات:
--      user_games: "Enable insert/update for users based on user_id" (تخلي المستخدم يعطي نفسه شراء)
--      transactions: "Service role can insert transactions" (هي للكل مو لمفتاح الخدمة)،
--                    و "Users can view own transactions"
-- 4) profiles: نسحب DELETE و TRUNCATE من anon و authenticated.
--
-- مين الأدمن؟ نفس شرط الموقع كله (middleware.ts، admin-users.ts، quiz-admin.ts):
--   app_metadata.role = 'admin' من توكن المستخدم. المستخدم ما يقدر يغيّرها بنفسه.
--   ما نستخدم profiles.role لأنه ما يطابق: الأدمن الحقيقي مكتوب له Player هناك.
--
-- مين يكتب في هالجداول، ووش يصير له؟
--   صفحات أدمن المزاد وحرب القلاع والسيطرة، ونسخ/استرجاع لوحة الأدمن:
--     من المتصفح بجلسة الأدمن => القاعدة الجديدة تسمح له.
--   أدمن تحدي الفئات (app/actions/quiz-admin.ts): مفتاح الخدمة => ما يتأثر.
--   نموذج التواصل (actions/contact.ts): جلسة الزائر أو المستخدم => الإرسال مسموح للكل.
--   صفحة الرسائل في الأدمن: من المتصفح بجلسة الأدمن => القراءة والحذف للأدمن.
--   جداول الإعدادات: الكود يقراها بس، وما يكتب فيها أبداً.
--
-- التراجع: قبل أي تغيير، الملف يحفظ الوضع قبل بالضبط في جدول
--   security_backup_0012 (القواعد، والصلاحيات، وحالة الحماية، وإعداد الدالة).
--   الجدول مقفول: ما يقراه إلا SQL Editor ومفتاح الخدمة. وأول تشغيل بس هو اللي يحفظ.
--   ملف التراجع يرجّع كل شي منه:
--   supabase/rollback/0012_lock_content_tables_rollback.sql
--
-- قبل التشغيل: شغّل supabase/checks/0012_status.sql وأرسل نتيجته.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك صف لكل جدول للتأكد.
-- بعد التشغيل: supabase/checks/0012_lock_content_tables_check.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0) نسخة الوضع قبل
-- ---------------------------------------------------------------------
create table if not exists public.security_backup_0012 (
  id           bigserial primary key,
  kind         text not null,          -- table | policy | grant | colgrant | function
  table_name   text,
  rls_enabled  boolean,
  policy_name  text,
  permissive   text,
  roles        text[],
  cmd          text,
  qual         text,
  with_check   text,
  grantee      text,
  privilege    text,
  column_name  text,
  fn_signature text,
  fn_secdef    boolean,
  fn_config    text[],
  saved_at     timestamptz not null default now()
);
alter table public.security_backup_0012 enable row level security;
revoke all on table public.security_backup_0012 from anon, authenticated, public;
revoke all on sequence public.security_backup_0012_id_seq from anon, authenticated, public;

do $$
declare
  content_tables text[] := array['aw_questions', 'cw_questions', 'wd_country_questions', 'wd_countries', 'wd_challenges',
                                 'quiz_questions', 'quiz_categories', 'aw_settings', 'cw_settings', 'wd_settings'];
  policy_tables  text[] := content_tables || array['contact_messages', 'user_games', 'transactions'];
  grant_tables   text[] := content_tables || array['contact_messages', 'profiles'];
begin
  if exists (select 1 from public.security_backup_0012) then
    raise notice 'نسخة الوضع قبل محفوظة من أول تشغيل، ما نغيّرها';
    return;
  end if;

  -- حالة الحماية للجداول اللي تتغيّر قواعدها
  insert into public.security_backup_0012 (kind, table_name, rls_enabled)
  select 'table', c.relname, c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any (policy_tables);

  -- القواعد كاملة
  insert into public.security_backup_0012 (kind, table_name, policy_name, permissive, roles, cmd, qual, with_check)
  select 'policy', p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check
    from pg_policies p
   where p.schemaname = 'public' and p.tablename = any (policy_tables);

  -- صلاحيات الجدول لـ anon و authenticated و PUBLIC
  insert into public.security_backup_0012 (kind, table_name, grantee, privilege)
  select 'grant', c.relname,
         case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
         a.privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname = any (grant_tables)
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'));

  -- صلاحيات الأعمدة (مثل اسم وجوال profiles)
  insert into public.security_backup_0012 (kind, table_name, column_name, grantee, privilege)
  select 'colgrant', c.relname, att.attname,
         case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
         a.privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute att on att.attrelid = c.oid and att.attnum > 0 and not att.attisdropped and att.attacl is not null
    cross join lateral aclexplode(att.attacl) a
   where n.nspname = 'public' and c.relname = any (grant_tables)
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'));

  -- إعداد دالة فحص التكرار
  insert into public.security_backup_0012 (kind, fn_signature, fn_secdef, fn_config)
  select 'function', p.oid::regprocedure::text, p.prosecdef, p.proconfig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'check_recent_message';
end $$;

-- ---------------------------------------------------------------------
-- 1) بنوك الأسئلة والإعدادات: القراءة للكل، والكتابة للأدمن
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  p record;
  is_admin constant text := $q$((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'$q$;
begin
  foreach t in array array['aw_questions', 'cw_questions', 'wd_country_questions', 'wd_countries', 'wd_challenges',
                           'quiz_questions', 'quiz_categories', 'aw_settings', 'cw_settings', 'wd_settings'] loop
    execute format('alter table public.%I enable row level security', t);

    -- نشيل كل القواعد الموجودة (محفوظة فوق) ونحط قاعدتين واضحتين بدالها
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)',
                   t || '_read_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
                   t || '_admin_write', t, is_admin, is_admin);

    -- الزائر يقرا بس. والمسجّل يحتاج الكتابة بالصلاحيات عشان الأدمن، والقاعدة تحصرها فيه
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from anon, public', t);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) الرسائل: الإرسال للكل، والقراءة والحذف للأدمن
-- ---------------------------------------------------------------------
do $$
declare
  p record;
  fn record;
  is_admin constant text := $q$((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'$q$;
begin
  alter table public.contact_messages enable row level security;

  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'contact_messages' loop
    execute format('drop policy %I on public.contact_messages', p.policyname);
  end loop;
  create policy contact_messages_insert_all on public.contact_messages
    for insert to anon, authenticated with check (true);
  execute format('create policy contact_messages_admin_read on public.contact_messages for select to authenticated using (%s)', is_admin);
  execute format('create policy contact_messages_admin_delete on public.contact_messages for delete to authenticated using (%s)', is_admin);

  revoke select, update, delete, truncate, references, trigger on table public.contact_messages from anon, public;
  revoke update, truncate, references, trigger on table public.contact_messages from authenticated;
  -- صفحة الرسائل تحذف من المتصفح بجلسة الأدمن (القاعدة فوق تحصر الحذف فيه)
  grant delete on table public.contact_messages to authenticated;

  -- فحص التكرار يقرا الرسائل السابقة: لو كان يشتغل بصلاحية المرسل، يصير بصلاحية مالكه.
  -- لو هو أصلاً security definer (مثل الإنتاج) ما نلمسه ولا نغيّر مساره.
  for fn in
    select p2.oid::regprocedure as sig
      from pg_proc p2
      join pg_namespace n on n.oid = p2.pronamespace
     where n.nspname = 'public' and p2.proname = 'check_recent_message' and not p2.prosecdef
  loop
    execute format('alter function %s security definer set search_path = public, pg_temp', fn.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3) القواعد القديمة على user_games و transactions
-- ---------------------------------------------------------------------
drop policy if exists "Enable insert for users based on user_id" on public.user_games;
drop policy if exists "Enable update for users based on user_id" on public.user_games;
drop policy if exists "Service role can insert transactions" on public.transactions;
drop policy if exists "Users can view own transactions" on public.transactions;

-- ---------------------------------------------------------------------
-- 4) profiles: ما يحذف ولا يفرّغ إلا السيرفر
-- ---------------------------------------------------------------------
revoke delete, truncate on table public.profiles from anon, authenticated;

commit;

-- التأكد: صف لكل جدول
--   البنوك والإعدادات: rls = true، والقواعد <الجدول>_read_all و <الجدول>_admin_write، و anon_privs = SELECT بس
--   contact_messages: rls = true، وثلاث قواعد، و anon_privs = INSERT بس،
--                     و authenticated_privs = DELETE, INSERT, SELECT
--   user_games و transactions: ما فيه قواعد، وما فيه صلاحيات (من 0011)
--   profiles: anon و authenticated بدون DELETE و TRUNCATE
select c.relname as table_name,
       c.relrowsecurity as rls,
       (select coalesce(string_agg(p.policyname || ':' || p.cmd, ', ' order by p.policyname), '')
          from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'anon') as anon_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'authenticated') as authenticated_privs
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('aw_questions', 'cw_questions', 'wd_country_questions', 'wd_countries', 'wd_challenges',
                     'quiz_questions', 'quiz_categories', 'aw_settings', 'cw_settings', 'wd_settings',
                     'contact_messages', 'user_games', 'transactions', 'profiles')
 order by 1;
