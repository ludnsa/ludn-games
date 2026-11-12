-- =====================================================================
-- التراجع عن 0016_policies_and_fk_indexes.sql
-- يرجّع الوضع قبل 0016 بالضبط:
--   1) قواعد العشر جداول: يرجّع <الجدول>_admin_write (لكل الأوامر) من النسخة المحفوظة بالحرف
--      (نفس الأدوار والشرط)، ويشيل admin_insert و admin_update و admin_delete.
--      read_all ما تنلمس. والصلاحيات ما تتغير (0016 أصلاً ما لمسها).
--   2) الفهارس: يشيل بس الفهارس اللي أنشأها 0016 (مسجّلة في النسخة). أي فهرس كان موجود قبل ما ينلمس.
--
-- ما يلمس البيانات. تنبيه Performance Advisor يرجع زي ما كان.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك صف لكل جدول للتأكد.
--   جدول النسخة security_backup_0016 يظل (مقفول)، عشان لو انعاد 0016 يلقى نسخة قبل الأصلية.
-- =====================================================================

begin;

do $$
declare
  t text;
  b record;
  roles_sql text;
  x record;
begin
  if to_regclass('public.security_backup_0016') is null then
    raise exception 'التراجع وقف: ما لقيت security_backup_0016، يعني 0016 ما انشغّل أصلاً';
  end if;

  foreach t in array array['aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                           'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings'] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_admin_write') then
      raise notice '% قواعده على الوضع قبل، نتخطاه', t;
      continue;
    end if;

    select * into b
      from public.security_backup_0016
     where kind = 'policy' and table_name = t and policy_name = t || '_admin_write'
     order by id
     limit 1;
    if not found then
      raise exception 'التراجع وقف وما غيّر شي: ما لقيت نسخة % بالنسخة المحفوظة', t || '_admin_write';
    end if;
    select string_agg(quote_ident(r), ', ') into roles_sql from unnest(b.roles) as r;

    execute format('create policy %I on public.%I as %s for all to %s using (%s) with check (%s)',
                   b.policy_name, t, lower(b.permissive), roles_sql, b.qual, b.with_check);
    execute format('drop policy if exists %I on public.%I', t || '_admin_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
  end loop;

  for x in select distinct index_name from public.security_backup_0016 where kind = 'index_created' loop
    execute format('drop index if exists public.%I', x.index_name);
  end loop;
end $$;

commit;

-- التأكد: العشرة رجعت قواعدها <الجدول>_read_all و <الجدول>_admin_write، والفهارس اللي أنشأها 0016 انشالت
select c.relname as table_name,
       (select coalesce(string_agg(p.policyname || ':' || p.cmd, ', ' order by p.policyname), '')
          from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies,
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
