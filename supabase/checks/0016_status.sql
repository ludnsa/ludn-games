-- ============================================================================
-- الوضع قبل 0016_policies_and_fk_indexes.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام:
--   1 policies  قواعد كل جدول من العشرة.
--               المتوقع: before = <الجدول>_read_all للقراءة و <الجدول>_admin_write لكل شي (من 0012)
--   2 overlap   الأوامر اللي عليها أكثر من قاعدة مسموحة لنفس الدور (سبب تنبيه Performance Advisor).
--               المتوقع الحين: authenticated/SELECT=2 بكل جدول
--   3 expr      شرط الأدمن وشرط القراءة بالضبط (المتوقع: شرط أدمن واحد بالعشرة، والقراءة true)
--   4 grants    صلاحيات anon و authenticated على العشرة (0016 ما يلمسها، وتظل نفسها بعده)
--   5 fk        المفاتيح الأجنبية الخمسة: العمود والقيد، وأي فهرس يبدأ بالعمود (المتوقع: none)
--   6 names     أسماء الفهارس الجديدة (المتوقع: free)
--   7 indexes   الفهارس الموجودة الحين بالجداول الثلاثة (0016 ما يحذف منها شي)
--   8 rows      عدد الصفوف بالجداول الثلاثة (بناء الفهرس ياخذ أجزاء من الثانية لهالأحجام)
--   9 backup    جدول النسخة security_backup_0016 (المتوقع: free)
-- ============================================================================

with tbl(name) as (
  values ('aw_questions'), ('aw_settings'), ('cw_questions'), ('cw_settings'), ('quiz_categories'),
         ('quiz_questions'), ('wd_challenges'), ('wd_countries'), ('wd_country_questions'), ('wd_settings')
),
pol as (
  select t.name,
         count(p.policyname) as n,
         coalesce(string_agg(p.policyname || ':' || p.cmd || ':' || array_to_string(p.roles::text[], '+'), ', ' order by p.policyname), 'NONE') as list,
         coalesce(bool_or(p.policyname = t.name || '_read_all' and p.cmd = 'SELECT' and p.permissive = 'PERMISSIVE'
                          and p.roles::text[] @> array['anon', 'authenticated'] and cardinality(p.roles) = 2
                          and p.qual = 'true' and p.with_check is null), false) as read_ok,
         coalesce(bool_or(p.policyname = t.name || '_admin_write' and p.cmd = 'ALL' and p.permissive = 'PERMISSIVE'
                          and p.roles::text[] = array['authenticated'] and p.qual is not null and p.with_check = p.qual), false) as write_ok,
         coalesce(bool_or(p.policyname = t.name || '_admin_insert' and p.cmd = 'INSERT' and p.permissive = 'PERMISSIVE'
                          and p.qual is null and p.with_check is not null), false) as ins_ok,
         coalesce(bool_or(p.policyname = t.name || '_admin_update' and p.cmd = 'UPDATE' and p.permissive = 'PERMISSIVE'
                          and p.qual is not null and p.with_check = p.qual), false) as upd_ok,
         coalesce(bool_or(p.policyname = t.name || '_admin_delete' and p.cmd = 'DELETE' and p.permissive = 'PERMISSIVE'
                          and p.qual is not null and p.with_check is null), false) as del_ok
    from tbl t
    left join pg_policies p on p.schemaname = 'public' and p.tablename = t.name
   group by t.name
),
fk(tbl, col, idx) as (
  values ('mafia_actions', 'actor_id', 'mafia_actions_actor_id_idx'),
         ('mafia_actions', 'target_id', 'mafia_actions_target_id_idx'),
         ('mafia_votes', 'target_id', 'mafia_votes_target_id_idx'),
         ('mafia_votes', 'voter_id', 'mafia_votes_voter_id_idx'),
         ('quiz_session_questions', 'question_id', 'quiz_session_questions_question_id_idx')
)

select '1 policies' as section,
       p.name,
       p.list || '  => ' ||
       case when to_regclass('public.' || p.name) is null then 'MISSING TABLE'
            when p.n = 2 and p.read_ok and p.write_ok then 'before'
            when p.n = 4 and p.read_ok and p.ins_ok and p.upd_ok and p.del_ok then 'after (0016 already ran)'
            else 'OTHER' end as detail
  from pol p

union all
select '2 overlap',
       t.name,
       coalesce((select string_agg(x.role || '/' || x.act || '=' || x.cnt, ', ' order by x.role, x.act)
                   from (select r.role, a.act, count(*) as cnt
                           from pg_policies p
                          cross join unnest(p.roles::text[]) as r(role)
                          cross join unnest(case when p.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) as a(act)
                          where p.schemaname = 'public' and p.tablename = t.name and p.permissive = 'PERMISSIVE'
                          group by r.role, a.act
                         having count(*) > 1) as x), 'none')
  from tbl t

union all
select '3 expr',
       count(*) || ' policies: ' || string_agg(p.policyname, ', ' order by p.policyname),
       'using: ' || coalesce(p.qual, '-') || '  | check: ' || coalesce(p.with_check, '-')
  from pg_policies p
 where p.schemaname = 'public'
   and p.tablename in (select name from tbl)
 group by p.qual, p.with_check

union all
select '4 grants',
       t.name,
       'anon: ' || coalesce((select string_agg(g.privilege_type, ',' order by g.privilege_type)
                               from information_schema.role_table_grants g
                              where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'anon'), '-')
       || ' | authenticated: ' || coalesce((select string_agg(g.privilege_type, ',' order by g.privilege_type)
                                              from information_schema.role_table_grants g
                                             where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'authenticated'), '-')
  from tbl t

union all
select '5 fk',
       f.tbl || '.' || f.col,
       case when c.oid is null then 'MISSING TABLE'
            when a.attnum is null then 'MISSING COLUMN'
            else coalesce((select string_agg(con.conname || ' -> ' || con.confrelid::regclass::text, ', ')
                             from pg_constraint con
                            where con.conrelid = c.oid and con.contype = 'f' and con.conkey = array[a.attnum]), 'no fk')
                 || ' | index starting with it: '
                 || coalesce((select string_agg(ic.relname, ', ')
                                from pg_index i
                                join pg_class ic on ic.oid = i.indexrelid
                               where i.indrelid = c.oid and i.indkey[0] = a.attnum), 'none')
       end
  from fk f
  left join pg_class c on c.oid = to_regclass('public.' || f.tbl)
  left join pg_attribute a on a.attrelid = c.oid and a.attname = f.col and not a.attisdropped

union all
select '6 names',
       f.idx,
       case when to_regclass('public.' || f.idx) is null then 'free' else 'TAKEN' end
  from fk f

union all
select '7 indexes',
       x.tbl,
       coalesce((select string_agg(ic.relname, ', ' order by ic.relname)
                   from pg_index i
                   join pg_class ic on ic.oid = i.indexrelid
                  where i.indrelid = to_regclass('public.' || x.tbl)), 'none')
  from (values ('mafia_actions'), ('mafia_votes'), ('quiz_session_questions')) as x(tbl)

union all
select '8 rows',
       x.tbl,
       x.n::text
  from (select 'mafia_actions' as tbl, (select count(*) from public.mafia_actions) as n
        union all select 'mafia_votes', (select count(*) from public.mafia_votes)
        union all select 'quiz_session_questions', (select count(*) from public.quiz_session_questions)) as x

union all
select '9 backup',
       'public.security_backup_0016',
       case when to_regclass('public.security_backup_0016') is null then 'free' else 'EXISTS' end

order by 1, 2;
