-- =====================================================================
-- 0016_policies_and_fk_indexes.sql
-- تحسين أداء بدون أي تغيير بالصلاحيات:
--
-- 1) "multiple permissive policies" (Performance Advisor) في عشر جداول:
--      aw_questions, aw_settings, cw_questions, cw_settings, quiz_categories,
--      quiz_questions, wd_challenges, wd_countries, wd_country_questions, wd_settings
--    السبب: قاعدة <الجدول>_admin_write (من 0012) لكل الأوامر (ALL)، فتشمل القراءة مع
--    <الجدول>_read_all، وكل قراءة من مستخدم مسجّل تحسب قاعدتين.
--    الحل: admin_write تنقسم لثلاث قواعد للأدمن بس: إضافة وتعديل وحذف،
--    بنفس الأدوار ونفس الشرط بالحرف (ينسخ من القاعدة نفسها بالقاعدة، ما ينكتب من جديد).
--    والقراءة تظل على read_all بس (للكل، مثل الحين).
--    الصلاحيات نفسها بالضبط:
--      القراءة:         للكل (read_all = true، والأدمن كان ياخذها منها أصلاً)
--      الإضافة:         الأدمن بس (نفس شرط with check)
--      التعديل:         الأدمن بس (نفس شرط using و with check)
--      الحذف:           الأدمن بس (نفس شرط using)
--      الصلاحيات على الجداول (grants) ما تنلمس.
--
-- 2) فهارس للمفاتيح الأجنبية الناقصة (تسرّع الحذف المتسلسل والبحث بها):
--      mafia_actions (actor_id)، mafia_actions (target_id)
--      mafia_votes (target_id)، mafia_votes (voter_id)
--      quiz_session_questions (question_id)
--    ما ينحذف أي فهرس موجود.
--
-- الأمان:
--   - لو أي جدول من العشرة قواعده غير المتوقع (مو read_all + admin_write كما وضعها 0012)،
--     الملف يوقف بخطأ وما يتغيّر ولا شي (كله بخطوة وحدة).
--   - قبل أي تغيير ينحفظ الوضع قبل في security_backup_0016 (القواعد والصلاحيات والفهارس)،
--     مقفول على SQL Editor ومفتاح الخدمة. أول تشغيل بس هو اللي يحفظ.
--   - قابل لإعادة التشغيل: الجدول اللي انقسمت قواعده يتخطاه، والفهرس الموجود ما ينعاد.
--   - بناء الفهرس يقفل الكتابة على جدوله لحظات (الجداول صغيرة، والعدد بقسم 8 من الفحص قبل).
--
-- قبل التشغيل: supabase/checks/0016_status.sql وأرسل نتيجته.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   آخر استعلام يطلع لك صف لكل جدول للتأكد.
-- بعد التشغيل: supabase/checks/0016_policies_and_fk_indexes_check.sql
-- التراجع: supabase/rollback/0016_policies_and_fk_indexes_rollback.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0) نسخة الوضع قبل
-- ---------------------------------------------------------------------
create table if not exists public.security_backup_0016 (
  id          bigserial primary key,
  kind        text not null,          -- policy | grant | index (موجود قبل) | index_created (أنشأه 0016)
  table_name  text,
  policy_name text,
  permissive  text,
  roles       text[],
  cmd         text,
  qual        text,
  with_check  text,
  grantee     text,
  privilege   text,
  index_name  text,
  saved_at    timestamptz not null default now()
);
alter table public.security_backup_0016 enable row level security;
revoke all on table public.security_backup_0016 from anon, authenticated, public;
revoke all on sequence public.security_backup_0016_id_seq from anon, authenticated, public;

do $$
declare
  content_tables text[] := array['aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                                 'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings'];
  index_tables   text[] := array['mafia_actions', 'mafia_votes', 'quiz_session_questions'];
begin
  if exists (select 1 from public.security_backup_0016 where kind in ('policy', 'grant', 'index')) then
    raise notice 'نسخة الوضع قبل محفوظة من أول تشغيل، ما نغيّرها';
    return;
  end if;

  insert into public.security_backup_0016 (kind, table_name, policy_name, permissive, roles, cmd, qual, with_check)
  select 'policy', p.tablename, p.policyname, p.permissive, p.roles::text[], p.cmd, p.qual, p.with_check
    from pg_policies p
   where p.schemaname = 'public' and p.tablename = any (content_tables);

  insert into public.security_backup_0016 (kind, table_name, grantee, privilege)
  select 'grant', c.relname,
         case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
         a.privilege_type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   cross join lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname = any (content_tables)
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'));

  insert into public.security_backup_0016 (kind, table_name, index_name)
  select 'index', t.relname, ic.relname
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_class ic on ic.oid = i.indexrelid
   where n.nspname = 'public' and t.relname = any (index_tables);
end $$;

-- ---------------------------------------------------------------------
-- 1) قسمة admin_write: إضافة وتعديل وحذف للأدمن، والقراءة على read_all بس
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  w record;
  n integer;
  read_ok boolean;
  write_ok boolean;
  split_ok boolean;
  roles_sql text;
begin
  -- أول: كل الجداول لازم تكون قبل أو بعد بالضبط، وإلا نوقف قبل أي تغيير
  foreach t in array array['aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                           'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings'] loop
    if to_regclass('public.' || t) is null then
      raise exception '0016 وقف وما غيّر شي: الجدول % مو موجود', t;
    end if;
    select count(*),
           coalesce(bool_or(policyname = t || '_read_all' and cmd = 'SELECT' and permissive = 'PERMISSIVE'
                            and roles::text[] @> array['anon', 'authenticated'] and cardinality(roles) = 2
                            and qual = 'true' and with_check is null), false),
           coalesce(bool_or(policyname = t || '_admin_write' and cmd = 'ALL' and permissive = 'PERMISSIVE'
                            and roles::text[] = array['authenticated'] and qual is not null and with_check = qual), false)
      into n, read_ok, write_ok
      from pg_policies
     where schemaname = 'public' and tablename = t;
    select count(*) = 3 into split_ok
      from pg_policies
     where schemaname = 'public' and tablename = t and permissive = 'PERMISSIVE'
       and ((policyname = t || '_admin_insert' and cmd = 'INSERT' and qual is null and with_check is not null)
         or (policyname = t || '_admin_update' and cmd = 'UPDATE' and qual is not null and with_check = qual)
         or (policyname = t || '_admin_delete' and cmd = 'DELETE' and qual is not null and with_check is null));
    if not ((n = 2 and read_ok and write_ok) or (n = 4 and read_ok and split_ok)) then
      raise exception '0016 وقف وما غيّر شي: قواعد % غير المتوقع (%). أرسل لي نتيجة 0016_status.sql', t, n;
    end if;
  end loop;

  -- القسمة: نفس الأدوار ونفس الشرط بالحرف من القاعدة نفسها
  foreach t in array array['aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                           'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings'] loop
    select * into w
      from pg_policies
     where schemaname = 'public' and tablename = t and policyname = t || '_admin_write';
    if not found then
      raise notice '% انقسمت من قبل، نتخطاه', t;
      continue;
    end if;
    select string_agg(quote_ident(r), ', ') into roles_sql from unnest(w.roles::text[]) as r;

    execute format('create policy %I on public.%I as permissive for insert to %s with check (%s)',
                   t || '_admin_insert', t, roles_sql, w.with_check);
    execute format('create policy %I on public.%I as permissive for update to %s using (%s) with check (%s)',
                   t || '_admin_update', t, roles_sql, w.qual, w.with_check);
    execute format('create policy %I on public.%I as permissive for delete to %s using (%s)',
                   t || '_admin_delete', t, roles_sql, w.qual);
    execute format('drop policy %I on public.%I', t || '_admin_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) فهارس المفاتيح الأجنبية (نسجّل اللي أنشأناها، عشان التراجع يشيلها هي بس)
-- ---------------------------------------------------------------------
do $$
declare
  x record;
begin
  for x in
    select * from (values
      ('mafia_actions', 'actor_id', 'mafia_actions_actor_id_idx'),
      ('mafia_actions', 'target_id', 'mafia_actions_target_id_idx'),
      ('mafia_votes', 'target_id', 'mafia_votes_target_id_idx'),
      ('mafia_votes', 'voter_id', 'mafia_votes_voter_id_idx'),
      ('quiz_session_questions', 'question_id', 'quiz_session_questions_question_id_idx')
    ) as v(tbl, col, idx)
  loop
    if to_regclass('public.' || x.idx) is not null then
      raise notice 'الفهرس % موجود، ما نعيده', x.idx;
      continue;
    end if;
    execute format('create index %I on public.%I (%I)', x.idx, x.tbl, x.col);
    if not exists (select 1 from public.security_backup_0016 where kind = 'index_created' and index_name = x.idx) then
      insert into public.security_backup_0016 (kind, table_name, index_name) values ('index_created', x.tbl, x.idx);
    end if;
  end loop;
end $$;

commit;

-- التأكد: صف لكل جدول
--   العشرة: قواعدها <الجدول>_read_all و _admin_insert و _admin_update و _admin_delete، و overlap = none
--   الثلاثة: الفهارس الجديدة موجودة مع القديمة
select c.relname as table_name,
       (select coalesce(string_agg(p.policyname || ':' || p.cmd, ', ' order by p.policyname), '')
          from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       coalesce((select string_agg(x.role || '/' || x.act || '=' || x.cnt, ', ')
                   from (select r.role, a.act, count(*) as cnt
                           from pg_policies p
                          cross join unnest(p.roles::text[]) as r(role)
                          cross join unnest(case when p.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) as a(act)
                          where p.schemaname = 'public' and p.tablename = c.relname and p.permissive = 'PERMISSIVE'
                          group by r.role, a.act
                         having count(*) > 1) as x), 'none') as overlap,
       (select coalesce(string_agg(ic.relname, ', ' order by ic.relname), '')
          from pg_index i
          join pg_class ic on ic.oid = i.indexrelid
         where i.indrelid = c.oid) as indexes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                     'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings',
                     'mafia_actions', 'mafia_votes', 'quiz_session_questions')
 order by 1;
