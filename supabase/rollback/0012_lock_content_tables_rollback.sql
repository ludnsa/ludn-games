-- =====================================================================
-- التراجع عن 0012_lock_content_tables.sql
-- يرجّع كل شي للوضع اللي قبل بالضبط، من النسخة اللي حفظها 0012 في security_backup_0012:
--   القواعد على البنوك والإعدادات والرسائل و user_games و transactions (يشيل الجديدة ويرجّع القديمة)
--   الصلاحيات (البنوك والإعدادات والرسائل و profiles): المسحوبة ترجع، و DELETE المضافة على الرسائل تنسحب
--   حالة الحماية (RLS) لكل جدول
--   إعداد دالة فحص التكرار check_recent_message
--
-- ⚠️ هذا يرجّع الثغرات (أي زائر يعدّل ويحذف البنوك، ويقرا الرسائل). شغّله بس لو شي
--    انكسر بعد 0012 (مثلاً صفحة أدمن ما تحفظ، أو نموذج التواصل وقف)، وقل لي على طول.
--
-- ما يمس جداول 0011 (user_games و transactions تبقى مقفولة)، بس يرجّع قواعدها القديمة
-- الأربع، وهي ما لها أثر وصلاحيات المتصفح مسحوبة.
-- جدول security_backup_0012 يبقى بعد التراجع (مقفول، وما يأثر على شي).
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   آخر استعلام يطلع لك صف لكل جدول. قارنه بنتيجة 0012_status.sql اللي قبل.
-- =====================================================================

begin;

do $$
declare
  r record;
  p record;
  roles_sql text;
  grantee_sql text;
  cfg text;
  t text;
begin
  if to_regclass('public.security_backup_0012') is null
     or not exists (select 1 from public.security_backup_0012 where kind = 'table') then
    raise exception 'ما فيه نسخة من الوضع قبل (security_backup_0012). وقّف وقل لي.';
  end if;

  -- 1) القواعد: نشيل الموجودة الحين على نفس الجداول، ونرجّع المحفوظة كما هي
  for r in select table_name from public.security_backup_0012 where kind = 'table' loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = r.table_name loop
      execute format('drop policy %I on public.%I', p.policyname, r.table_name);
    end loop;
  end loop;

  for r in select * from public.security_backup_0012 where kind = 'policy' order by id loop
    select string_agg(case when x = 'public' then 'public' else quote_ident(x) end, ', ')
      into roles_sql
      from unnest(r.roles) as x;
    execute format('create policy %I on public.%I as %s for %s to %s%s%s',
                   r.policy_name, r.table_name, r.permissive, r.cmd, roles_sql,
                   case when r.qual is not null then ' using (' || r.qual || ')' else '' end,
                   case when r.with_check is not null then ' with check (' || r.with_check || ')' else '' end);
  end loop;

  -- 2) الصلاحيات: 0012 سحب صلاحيات وأضاف وحدة (DELETE على الرسائل)، فنسحب كل صلاحيات
  --    anon و authenticated و PUBLIC على هالجداول، ونرجّع المحفوظة بالضبط (الجدول والأعمدة)
  foreach t in array array['aw_questions', 'cw_questions', 'wd_country_questions', 'wd_countries', 'wd_challenges',
                           'quiz_questions', 'quiz_categories', 'aw_settings', 'cw_settings', 'wd_settings',
                           'contact_messages', 'profiles'] loop
    execute format('revoke all on table public.%I from anon, authenticated, public', t);
  end loop;

  for r in select * from public.security_backup_0012 where kind = 'grant' order by id loop
    grantee_sql := case when r.grantee = 'PUBLIC' then 'public' else quote_ident(r.grantee) end;
    execute format('grant %s on table public.%I to %s', r.privilege, r.table_name, grantee_sql);
  end loop;

  for r in select * from public.security_backup_0012 where kind = 'colgrant' order by id loop
    grantee_sql := case when r.grantee = 'PUBLIC' then 'public' else quote_ident(r.grantee) end;
    execute format('grant %s (%I) on table public.%I to %s', r.privilege, r.column_name, r.table_name, grantee_sql);
  end loop;

  -- 3) حالة الحماية
  for r in select * from public.security_backup_0012 where kind = 'table' order by id loop
    execute format('alter table public.%I %s row level security',
                   r.table_name, case when r.rls_enabled then 'enable' else 'disable' end);
  end loop;

  -- 4) دالة فحص التكرار: نفس طريقة التشغيل والإعدادات اللي كانت
  for r in select * from public.security_backup_0012 where kind = 'function' order by id loop
    execute format('alter function %s %s', r.fn_signature,
                   case when r.fn_secdef then 'security definer' else 'security invoker' end);
    execute format('alter function %s reset all', r.fn_signature);
    if r.fn_config is not null then
      foreach cfg in array r.fn_config loop
        execute format('alter function %s set %s = %s', r.fn_signature,
                       split_part(cfg, '=', 1), substr(cfg, position('=' in cfg) + 1));
      end loop;
    end if;
  end loop;
end $$;

commit;

-- التأكد: قارن هالجدول بنتيجة 0012_status.sql اللي قبل
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
