-- ============================================================================
-- فحص 0016 بعد التشغيل، بأدوار حقيقية. ما يغيّر شي.
--
-- شغّله بعد 0016_policies_and_fk_indexes.sql، في SQL Editor.
--   0 القواعد: بكل جدول من العشرة read_all و admin_insert و admin_update و admin_delete بس،
--     وما فيه أمر عليه قاعدتين مسموحتين لنفس الدور، وشرط الأدمن نفس اللي كان بـ admin_write بالحرف،
--     والصلاحيات على الجداول نفس قبل بالضبط (من security_backup_0016)
--   1 الفهارس: الخمسة موجودة وجاهزة على العمود الصح، وكل فهرس كان موجود قبل لسه موجود
--   2 الصلاحيات بالتجربة على كل جدول من العشرة:
--       الزائر (anon):            يقرا، وما يضيف ولا يعدّل ولا يحذف
--       مسجّل عادي:               يقرا، وما يضيف ولا يعدّل ولا يحذف
--       أدمن (app_metadata.role): يقرا ويضيف ويعدّل ويحذف
--     التعديل والحذف يجربون على صف واحد، والإضافة نسخة من صف موجود (لو الجدول فاضي تتخطى).
--
-- النتيجة تطلع كرسالة خطأ حمراء، وهذا مقصود: الخطأ في آخره يلغي كل تجارب الفحص
-- (اللي انضاف وانعدّل وانحذف)، فما يبقى منها شي في القاعدة.
-- انسخ الرسالة كاملة وأرسلها.
-- ============================================================================

do $$
declare
  tables text[] := array['aw_questions', 'aw_settings', 'cw_questions', 'cw_settings', 'quiz_categories',
                         'quiz_questions', 'wd_challenges', 'wd_countries', 'wd_country_questions', 'wd_settings'];
  t text;
  report text := '';
  pass integer := 0;
  fail integer := 0;
  n integer;
  ok boolean;
  col text;
  cols text;
  rows_total bigint;
  who text;
  claims text;
  can_read boolean;
  can_ins text;
  can_upd text;
  can_del text;
  x record;
  line text;
begin
  if to_regclass('public.security_backup_0016') is null then
    raise exception 'نتيجة الفحص: ما لقيت security_backup_0016، يعني 0016 ما انشغّل.';
  end if;

  -- -------------------------------------------------------------------
  -- 0) القواعد والصلاحيات
  -- -------------------------------------------------------------------
  foreach t in array tables loop
    select count(*) = 4
           and bool_or(policyname = t || '_read_all' and cmd = 'SELECT' and permissive = 'PERMISSIVE'
                       and roles::text[] @> array['anon', 'authenticated'] and cardinality(roles) = 2 and qual = 'true' and with_check is null)
           and bool_or(policyname = t || '_admin_insert' and cmd = 'INSERT' and permissive = 'PERMISSIVE' and qual is null)
           and bool_or(policyname = t || '_admin_update' and cmd = 'UPDATE' and permissive = 'PERMISSIVE')
           and bool_or(policyname = t || '_admin_delete' and cmd = 'DELETE' and permissive = 'PERMISSIVE' and with_check is null)
      into ok
      from pg_policies where schemaname = 'public' and tablename = t;

    -- نفس شرط admin_write وأدواره بالحرف
    select ok and coalesce(bool_and(
             p.roles::text[] = b.roles
             and (p.cmd = 'INSERT' and p.with_check = b.with_check
               or p.cmd = 'UPDATE' and p.qual = b.qual and p.with_check = b.with_check
               or p.cmd = 'DELETE' and p.qual = b.qual)), false)
      into ok
      from pg_policies p
      join public.security_backup_0016 b on b.kind = 'policy' and b.table_name = t and b.policy_name = t || '_admin_write'
     where p.schemaname = 'public' and p.tablename = t and p.policyname like t || '\_admin\_%';

    -- ولا أمر عليه قاعدتين مسموحتين لنفس الدور
    select count(*) into n
      from (select r.role, a.act
              from pg_policies p
             cross join unnest(p.roles::text[]) as r(role)
             cross join unnest(case when p.cmd = 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) as a(act)
             where p.schemaname = 'public' and p.tablename = t and p.permissive = 'PERMISSIVE'
             group by r.role, a.act
            having count(*) > 1) as o;
    ok := ok and n = 0;

    -- الصلاحيات على الجدول نفس قبل بالضبط
    ok := ok and not exists (
      (select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type
         from pg_class c
         join pg_namespace ns on ns.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        where ns.nspname = 'public' and c.relname = t
          and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
       except
       select grantee, privilege from public.security_backup_0016 where kind = 'grant' and table_name = t)
      union all
      (select grantee, privilege from public.security_backup_0016 where kind = 'grant' and table_name = t
       except
       select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, a.privilege_type
         from pg_class c
         join pg_namespace ns on ns.oid = c.relnamespace
        cross join lateral aclexplode(c.relacl) a
        where ns.nspname = 'public' and c.relname = t
          and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))));

    if ok then pass := pass + 1; else fail := fail + 1; end if;
    report := report || E'\n0 ' || t || ': ' || case when ok then 'PASS' else 'FAIL' end
              || ' (قواعد: ' || (select string_agg(policyname || ':' || cmd, ', ' order by policyname)
                                    from pg_policies where schemaname = 'public' and tablename = t) || ')';
  end loop;

  -- -------------------------------------------------------------------
  -- 1) الفهارس
  -- -------------------------------------------------------------------
  for x in
    select * from (values
      ('mafia_actions', 'actor_id', 'mafia_actions_actor_id_idx'),
      ('mafia_actions', 'target_id', 'mafia_actions_target_id_idx'),
      ('mafia_votes', 'target_id', 'mafia_votes_target_id_idx'),
      ('mafia_votes', 'voter_id', 'mafia_votes_voter_id_idx'),
      ('quiz_session_questions', 'question_id', 'quiz_session_questions_question_id_idx')
    ) as v(tbl, col, idx)
  loop
    select exists (
      select 1
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
       where i.indexrelid = to_regclass('public.' || x.idx)
         and i.indrelid = to_regclass('public.' || x.tbl)
         and a.attname = x.col and i.indisvalid and i.indisready)
      into ok;
    if ok then pass := pass + 1; else fail := fail + 1; end if;
    report := report || E'\n1 ' || x.idx || ': ' || case when ok then 'PASS' else 'FAIL' end;
  end loop;

  select count(*) into n
    from public.security_backup_0016 b
   where b.kind = 'index' and to_regclass('public.' || b.index_name) is null;
  if n = 0 then pass := pass + 1; else fail := fail + 1; end if;
  report := report || E'\n1 الفهارس القديمة كلها موجودة (' ||
            (select count(*) from public.security_backup_0016 where kind = 'index') || '): ' ||
            case when n = 0 then 'PASS' else 'FAIL، ناقص ' || n end;

  -- -------------------------------------------------------------------
  -- 2) الصلاحيات بالتجربة
  -- -------------------------------------------------------------------
  foreach t in array tables loop
    -- عمود يقبل التعديل لنفسه، وأعمدة تقبل النسخ (بدون الأعمدة المولّدة دايماً)
    select a.attname into col
      from pg_attribute a
     where a.attrelid = to_regclass('public.' || t) and a.attnum > 0 and not a.attisdropped
       and a.attidentity <> 'a' and a.attgenerated = ''
     order by a.attnum
     limit 1;
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into cols
      from pg_attribute a
     where a.attrelid = to_regclass('public.' || t) and a.attnum > 0 and not a.attisdropped
       and a.attidentity <> 'a' and a.attgenerated = '';
    execute format('select count(*) from public.%I', t) into rows_total;
    line := '';
    ok := true;

    foreach who in array array['anon', 'user', 'admin'] loop
      claims := case who
                  when 'anon'  then '{"role":"anon"}'
                  when 'user'  then '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000016","app_metadata":{}}'
                  else              '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000016","app_metadata":{"role":"admin"}}'
                end;
      perform set_config('request.jwt.claims', claims, true);
      execute format('set local role %s', case when who = 'anon' then 'anon' else 'authenticated' end);

      -- القراءة
      begin
        execute format('select count(*) from public.%I', t) into n;
        can_read := (n = rows_total);
      exception when others then
        can_read := false;
      end;

      -- الإضافة: نسخة من صف موجود. 42501 = ممنوع (القاعدة أو الصلاحية).
      -- أخطاء القيود (تكرار المفتاح وغيره) تجي بعد ما القاعدة تسمح = yes. غيرها يطلع كما هو للمراجعة
      if rows_total = 0 then
        can_ins := 'skip';
      else
        begin
          execute format('insert into public.%I (%s) select %s from public.%I limit 1', t, cols, cols, t);
          can_ins := 'yes';
        exception
          when insufficient_privilege then can_ins := 'no';
          when integrity_constraint_violation then can_ins := 'yes';
          when others then can_ins := 'err ' || sqlstate;
        end;
      end if;

      -- التعديل والحذف: صف واحد. عدد الصفوف اللي تأثرت يقول القاعدة سمحت ولا لا
      if rows_total = 0 then
        can_upd := 'skip';
        can_del := 'skip';
      else
        begin
          execute format('update public.%I set %I = %I where ctid = (select ctid from public.%I limit 1)', t, col, col, t);
          get diagnostics n = row_count;
          can_upd := case when n > 0 then 'yes' else 'no' end;
        exception
          when insufficient_privilege then can_upd := 'no';
          when integrity_constraint_violation then can_upd := 'yes';
          when others then can_upd := 'err ' || sqlstate;
        end;
        begin
          execute format('delete from public.%I where ctid = (select ctid from public.%I limit 1)', t, t);
          get diagnostics n = row_count;
          can_del := case when n > 0 then 'yes' else 'no' end;
        exception
          when insufficient_privilege then can_del := 'no';
          when integrity_constraint_violation then can_del := 'yes';
          when others then can_del := 'err ' || sqlstate;
        end;
      end if;

      execute 'reset role';

      if who = 'admin' then
        ok := ok and can_read and can_ins in ('yes', 'skip') and can_upd in ('yes', 'skip') and can_del in ('yes', 'skip');
      else
        ok := ok and can_read and can_ins in ('no', 'skip') and can_upd in ('no', 'skip') and can_del in ('no', 'skip');
      end if;
      line := line || ' ' || who || '[قراءة ' || case when can_read then 'yes' else 'no' end
              || '، إضافة ' || can_ins || '، تعديل ' || can_upd || '، حذف ' || can_del || ']';
    end loop;

    if ok then pass := pass + 1; else fail := fail + 1; end if;
    report := report || E'\n2 ' || t || ' (' || rows_total || ' صف): ' || case when ok then 'PASS' else 'FAIL' end || line;
  end loop;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة): % نجح، % فشل%', pass, fail, report;
end $$;
