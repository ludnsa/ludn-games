-- ============================================================================
-- فحص 0014 على قاعدة الإنتاج بأدوار حقيقية. ما يغيّر شي.
--
-- شغّله بعد 0014_letters_hive_rooms.sql، في SQL Editor.
-- أول شي (القسم 0) يقرا الصلاحيات المسجّلة نفسها: Supabase يعطي أي جدول جديد كل الصلاحيات
-- لـ anon و authenticated تلقائياً (arwdDxtm)، و 0014 يسحبها. المتوقع:
--   hive_rooms       SELECT بس، لا على مستوى الجدول ولا على مستوى أي عمود
--   hive_room_hosts  ولا صلاحية
--   دالة updated_at  ما ينفع ينفذها المتصفح
-- بعدها يسوي غرفتين تجربة (HZZZ9 جديدة، و HZZZ8 قديمة عمرها يومين) ويجرب:
--   service_role   مفتاح الخدمة (طريق الموقع): لازم يقرا ويعدّل عادي
--   authenticated  مستخدم مسجّل، حتى صاحب الغرفة نفسه: يقرا الغرفة الجديدة بس، وممنوع من الكتابة
--                  ومن جدول أصحاب الغرف
--   anon           زائر بدون حساب (شاشة العرض): نفس المستخدم المسجّل
--
-- النتيجة تطلع كرسالة خطأ حمراء، وهذا مقصود: الخطأ في آخره يلغي كل تجارب الفحص،
-- فما يبقى منها شي في القاعدة. انسخ الرسالة كاملة وأرسلها.
-- ============================================================================

do $$
declare
  report text := '';
  n bigint;
  rows_changed int;
  real_user uuid;
  r text;
  switched boolean := false;
  t text;
  rl text;
  p text;
  privs text;
  colp text;
  expected text;
  privlist text[] := array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  -- 0) الصلاحيات المسجّلة فعلياً (تشمل اللي جاية من PUBLIC أو من دور ثاني)
  if current_setting('server_version_num')::int >= 170000 then
    privlist := privlist || 'MAINTAIN'::text;   -- حرف m في arwdDxtm
  end if;
  foreach t in array array['hive_rooms', 'hive_room_hosts'] loop
    report := report || E'\n0 الحماية (RLS) على ' || t || ': '
      || case when (select c.relrowsecurity from pg_class c where c.oid = ('public.' || t)::regclass)
              then 'مفعّلة (صح)' else 'مطفية ← مشكلة' end;
    expected := case when t = 'hive_rooms' then 'SELECT' else '' end;
    foreach rl in array array['anon', 'authenticated'] loop
      privs := '';
      foreach p in array privlist loop
        if has_table_privilege(rl, 'public.' || t, p) then
          privs := privs || case when privs = '' then '' else ', ' end || p;
        end if;
      end loop;
      -- صلاحيات على عمود معيّن (ما تطلع في صلاحيات الجدول)
      colp := '';
      foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
        if has_any_column_privilege(rl, 'public.' || t, p) and not has_table_privilege(rl, 'public.' || t, p) then
          colp := colp || case when colp = '' then '' else ', ' end || p;
        end if;
      end loop;
      report := report || E'\n0 صلاحيات ' || rl || ' على ' || t || ': '
        || case when privs = '' then 'ولا شي' else privs end
        || case when colp = '' then '' else ' + على أعمدة: ' || colp end
        || case when privs = expected and colp = '' then ' (صح)'
                else ' ← مشكلة (المتوقع: ' || case when expected = '' then 'ولا شي' else expected end || ')' end;
    end loop;
  end loop;
  foreach rl in array array['anon', 'authenticated'] loop
    report := report || E'\n0 ' || rl || ' ينفذ دالة updated_at: '
      || case when has_function_privilege(rl, 'public.hive_rooms_set_updated_at()', 'EXECUTE')
              then 'مسموح ← مشكلة' else 'ممنوع (صح)' end;
  end loop;

  -- 0) التجهيز بدور المالك (قبل ما نبدّل الدور)
  report := report || E'\n0 hive_rooms داخل البث اللحظي: '
    || case when exists (select 1 from pg_publication_tables
                          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hive_rooms')
            then 'نعم (صح)' else 'لا ← مشكلة' end;
  report := report || E'\n0 hive_room_hosts داخل البث اللحظي: '
    || case when exists (select 1 from pg_publication_tables
                          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hive_room_hosts')
            then 'نعم ← مشكلة' else 'لا (صح)' end;

  -- حساب حقيقي ما عنده غرفة (عشان نجرب صاحب الغرفة)
  select u.id into real_user
    from auth.users u
   where not exists (select 1 from public.hive_room_hosts h where h.host_user_id = u.id)
   order by u.created_at desc
   limit 1;

  insert into public.hive_rooms (room_code, state) values ('HZZZ9', '{"v":1,"status":"playing"}');
  insert into public.hive_rooms (room_code, state, updated_at) values ('HZZZ8', '{"v":1,"status":"playing"}', now() - interval '2 days');
  if real_user is not null then
    insert into public.hive_room_hosts (room_code, host_user_id) values ('HZZZ9', real_user);
  end if;

  begin
    insert into public.hive_rooms (room_code, state) values ('hzzz7', '{}');
    report := report || E'\n0 كود بصيغة غلط: انقبل ← مشكلة';
  exception when check_violation then
    report := report || E'\n0 كود بصيغة غلط: مرفوض (صح)';
  end;
  begin
    insert into public.hive_rooms (room_code, state) values ('HZZZ7', '[]');
    report := report || E'\n0 حالة مو object: انقبلت ← مشكلة';
  exception when check_violation then
    report := report || E'\n0 حالة مو object: مرفوضة (صح)';
  end;

  -- 1) مفتاح الخدمة: طريق الموقع، لازم يشتغل
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    perform set_config('role', 'service_role', true);
    switched := current_user = 'service_role';
  exception when others then
    switched := false;
  end;
  if not switched then
    report := report || E'\n1 ما قدرت أجرب بدور service_role هنا (تخطيته). نجربه من الموقع بعد رفع الكود.';
  else
    begin
      select count(*) into n from public.hive_rooms where room_code in ('HZZZ9', 'HZZZ8');
      report := report || E'\n1 service_role يقرا الغرف: ' || n || ' من 2 ' || case when n = 2 then '(صح)' else '← مشكلة' end;
    exception when others then
      report := report || E'\n1 service_role يقرا الغرف: ممنوع ← الموقع يتعطل (' || sqlerrm || ')';
    end;
    begin
      update public.hive_rooms set state = '{"v":1,"status":"playing","round":2}', rev = rev + 1 where room_code = 'HZZZ9';
      get diagnostics rows_changed = row_count;
      report := report || E'\n1 service_role يحفظ حالة اللوحة: ' || case when rows_changed = 1 then 'مسموح (صح)' else 'ما لقى الغرفة ← مشكلة' end;
    exception when others then
      report := report || E'\n1 service_role يحفظ حالة اللوحة: ممنوع ← الموقع يتعطل (' || sqlerrm || ')';
    end;
    begin
      select count(*) into n from public.hive_room_hosts where room_code = 'HZZZ9';
      report := report || E'\n1 service_role يقرا صاحب الغرفة: مسموح (صح)';
    exception when others then
      report := report || E'\n1 service_role يقرا صاحب الغرفة: ممنوع ← الموقع يتعطل (' || sqlerrm || ')';
    end;
  end if;

  -- 2) مستخدم مسجّل (صاحب الغرفة نفسه لو لقينا حساب)
  perform set_config('request.jwt.claims', json_build_object('sub', real_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  report := report || E'\n2 (الدور الفعلي: ' || current_user || ')';
  -- 3) زائر بدون حساب (شاشة العرض)
  -- نفس التجارب للدورين
  for i in 2..3 loop
    if i = 3 then
      perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
      perform set_config('role', 'anon', true);
      report := report || E'\n3 (الدور الفعلي: ' || current_user || ')';
    end if;
    r := case when i = 2 then E'\n2 مستخدم مسجّل ' else E'\n3 زائر ' end;

    begin
      select count(*) into n from public.hive_rooms where room_code = 'HZZZ9';
      report := report || r || 'يقرا الغرفة الجديدة: ' || case when n = 1 then 'مسموح (صح)' else 'ما شافها ← مشكلة' end;
    exception when others then
      report := report || r || 'يقرا الغرفة الجديدة: ممنوع ← شاشة العرض ما تشتغل (' || sqlerrm || ')';
    end;
    begin
      select count(*) into n from public.hive_rooms where room_code = 'HZZZ8';
      report := report || r || 'يقرا الغرفة القديمة: ' || case when n = 0 then 'مخفية (صح)' else 'ظاهرة ← مشكلة' end;
    exception when others then
      report := report || r || 'يقرا الغرفة القديمة: خطأ ثاني (' || sqlerrm || ')';
    end;
    begin
      select count(*) into n from public.hive_room_hosts;
      report := report || r || 'يقرا أصحاب الغرف: مسموح (' || n || ' صف) ← مشكلة';
    exception when insufficient_privilege then
      report := report || r || 'يقرا أصحاب الغرف: ممنوع (صح)';
    when others then
      report := report || r || 'يقرا أصحاب الغرف: خطأ ثاني (' || sqlerrm || ')';
    end;
    begin
      update public.hive_rooms set state = '{"hacked":true}' where room_code = 'HZZZ9';
      get diagnostics rows_changed = row_count;
      report := report || r || 'يعدّل اللوحة: ' || case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
    exception when insufficient_privilege then
      report := report || r || 'يعدّل اللوحة: ممنوع (صح)';
    when others then
      report := report || r || 'يعدّل اللوحة: خطأ ثاني (' || sqlerrm || ')';
    end;
    begin
      insert into public.hive_rooms (room_code, state) values ('HZZZ6', '{"v":1}');
      report := report || r || 'يسوي غرفة: مسموح ← مشكلة';
    exception when insufficient_privilege then
      report := report || r || 'يسوي غرفة: ممنوع (صح)';
    when others then
      report := report || r || 'يسوي غرفة: خطأ ثاني (' || sqlerrm || ')';
    end;
    begin
      delete from public.hive_rooms where room_code = 'HZZZ9';
      get diagnostics rows_changed = row_count;
      report := report || r || 'يحذف الغرفة: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذفت ← مشكلة' end;
    exception when insufficient_privilege then
      report := report || r || 'يحذف الغرفة: ممنوع (صح)';
    when others then
      report := report || r || 'يحذف الغرفة: خطأ ثاني (' || sqlerrm || ')';
    end;
    begin
      insert into public.hive_room_hosts (room_code, host_user_id) values ('HZZZ8', coalesce(real_user, '00000000-0000-4000-8000-00000000abcd'));
      report := report || r || 'يسجّل نفسه صاحب غرفة: مسموح ← مشكلة';
    exception when insufficient_privilege then
      report := report || r || 'يسجّل نفسه صاحب غرفة: ممنوع (صح)';
    when others then
      report := report || r || 'يسجّل نفسه صاحب غرفة: خطأ ثاني (' || sqlerrm || ')';
    end;
  end loop;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%', report;
end;
$$;
