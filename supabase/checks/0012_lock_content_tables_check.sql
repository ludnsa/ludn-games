-- ============================================================================
-- فحص 0012 على قاعدة الإنتاج بأدوار حقيقية. ما يغيّر شي.
--
-- شغّله بعد 0012_lock_content_tables.sql، في SQL Editor.
-- يجرب بأربع أدوار:
--   anon           زائر: يقرا البنوك والإعدادات، ويرسل رسالة تواصل، وممنوع من الباقي
--   authenticated  مستخدم مسجّل عادي: نفس الزائر، وما يشوف رسائل غيره
--   admin          الأدمن الحقيقي (app_metadata.role = admin): يضيف ويعدّل ويحذف، ويقرا الرسائل ويحذفها
--   service_role   مفتاح الخدمة: يقرا عادي
--
-- النتيجة تطلع كرسالة خطأ حمراء، وهذا مقصود: الخطأ في آخره يلغي كل تجارب الفحص
-- (الرسالة التجريبية والسؤال المنسوخ وأي تعديل)، فما يبقى منها شي. انسخ الرسالة كاملة وأرسلها.
-- ============================================================================

do $$
declare
  report text := '';
  n bigint;
  rows_changed int;
  ok boolean;
  t text;
  admin_id uuid;
  user_id uuid;
  q_id text;
  marker constant text := 'zz-check-0012';
  switched boolean := false;
  content_tables constant text[] := array['aw_questions', 'cw_questions', 'wd_country_questions', 'wd_countries', 'wd_challenges',
                                          'quiz_questions', 'quiz_categories', 'aw_settings', 'cw_settings', 'wd_settings'];
begin
  -- نقرا اللي نحتاجه قبل ما نبدّل الدور
  select id into admin_id from auth.users where raw_app_meta_data ->> 'role' = 'admin' order by created_at limit 1;
  select id into user_id from auth.users where coalesce(raw_app_meta_data ->> 'role', '') <> 'admin' order by created_at desc limit 1;
  select id::text into q_id from public.aw_questions limit 1;
  if admin_id is null then
    raise exception 'ما لقيت أدمن في auth.users (app_metadata.role = admin)';
  end if;

  -- =========================== 1) زائر بدون حساب ===========================
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  report := report || E'\n1 (الدور الفعلي: ' || current_user || ')';

  foreach t in array content_tables loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      report := report || E'\n1 زائر يقرا ' || t || ': مسموح (' || n || ' صف) (صح)';
    exception when others then
      report := report || E'\n1 زائر يقرا ' || t || ': ممنوع ← اللعبة تتعطل (' || sqlerrm || ')';
    end;
  end loop;

  begin
    insert into public.aw_questions (category, question, options, answer, difficulty)
    select category, question || ' ' || marker, options, answer, difficulty from public.aw_questions limit 1;
    report := report || E'\n1 زائر يضيف سؤال: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يضيف سؤال: ممنوع (صح)';
  when others then
    report := report || E'\n1 زائر يضيف سؤال: خطأ ثاني (' || sqlerrm || ')';
  end;

  begin
    update public.aw_questions set question = question where id::text = q_id;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 زائر يعدّل سؤال: ' || case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يعدّل سؤال: ممنوع (صح)';
  when others then
    report := report || E'\n1 زائر يعدّل سؤال: خطأ ثاني (' || sqlerrm || ')';
  end;

  begin
    delete from public.wd_country_questions where true;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 زائر يحذف بنك السيطرة: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يحذف بنك السيطرة: ممنوع (صح)';
  when others then
    report := report || E'\n1 زائر يحذف بنك السيطرة: خطأ ثاني (' || sqlerrm || ')';
  end;

  begin
    update public.wd_settings set data = data where true;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 زائر يعدّل الإعدادات: ' || case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يعدّل الإعدادات: ممنوع (صح)';
  when others then
    report := report || E'\n1 زائر يعدّل الإعدادات: خطأ ثاني (' || sqlerrm || ')';
  end;

  -- نموذج التواصل: فحص التكرار ثم الإرسال (نفس ترتيب actions/contact.ts)
  begin
    execute 'select public.check_recent_message($1, $2)' into ok using 'zz-check-0012@example.invalid', '0500000012';
    report := report || E'\n1 زائر يشغّل فحص التكرار: يشتغل (صح)، النتيجة ' || coalesce(ok::text, 'null');
  exception when others then
    report := report || E'\n1 زائر يشغّل فحص التكرار: خطأ ← نموذج التواصل يتعطل (' || sqlerrm || ')';
  end;
  begin
    insert into public.contact_messages (name, phone, email, message)
    values ('فحص', '0500000012', 'zz-check-0012@example.invalid', marker);
    report := report || E'\n1 زائر يرسل رسالة تواصل: مسموح (صح)';
  exception when others then
    report := report || E'\n1 زائر يرسل رسالة تواصل: ممنوع ← نموذج التواصل يتعطل (' || sqlerrm || ')';
  end;
  begin
    execute 'select public.check_recent_message($1, $2)' into ok using 'zz-check-0012@example.invalid', '0500000012';
    report := report || E'\n1 فحص التكرار بعد الإرسال يشوف الرسالة: ' || case when ok then 'نعم (صح)' else 'لا ← فحص التكرار ما يشتغل' end;
  exception when others then
    report := report || E'\n1 فحص التكرار بعد الإرسال: خطأ (' || sqlerrm || ')';
  end;

  begin
    select count(*) into n from public.contact_messages;
    report := report || E'\n1 زائر يقرا الرسائل: ' || case when n = 0 then 'ما يشوف شي (صح)' else 'يشوف ' || n || ' ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يقرا الرسائل: ممنوع (صح)';
  end;
  begin
    delete from public.contact_messages where message <> marker;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 زائر يحذف الرسائل: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يحذف الرسائل: ممنوع (صح)';
  end;

  begin
    delete from public.profiles where true;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 زائر يحذف profiles: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 زائر يحذف profiles: ممنوع (صح)';
  end;

  -- ======================= 2) مستخدم مسجّل عادي =======================
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'app_metadata', json_build_object('provider', 'email'))::text, true);
  perform set_config('role', 'authenticated', true);
  report := report || E'\n2 (الدور الفعلي: ' || current_user || ')';

  begin
    select count(*) into n from public.aw_questions;
    report := report || E'\n2 مستخدم مسجّل يقرا بنك المزاد: مسموح (' || n || ' صف) (صح)';
  exception when others then
    report := report || E'\n2 مستخدم مسجّل يقرا بنك المزاد: ممنوع ← المزاد يتعطل (' || sqlerrm || ')';
  end;

  begin
    insert into public.aw_questions (category, question, options, answer, difficulty)
    select category, question || ' ' || marker, options, answer, difficulty from public.aw_questions limit 1;
    report := report || E'\n2 مستخدم مسجّل يضيف سؤال: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يضيف سؤال: ممنوع (صح)';
  when others then
    report := report || E'\n2 مستخدم مسجّل يضيف سؤال: خطأ ثاني (' || sqlerrm || ')';
  end;

  begin
    update public.aw_questions set question = question where id::text = q_id;
    get diagnostics rows_changed = row_count;
    report := report || E'\n2 مستخدم مسجّل يعدّل سؤال: ' || case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يعدّل سؤال: ممنوع (صح)';
  end;

  begin
    delete from public.cw_questions where true;
    get diagnostics rows_changed = row_count;
    report := report || E'\n2 مستخدم مسجّل يحذف بنك حرب القلاع: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يحذف بنك حرب القلاع: ممنوع (صح)';
  end;

  begin
    select count(*) into n from public.contact_messages;
    report := report || E'\n2 مستخدم مسجّل يقرا الرسائل: ' || case when n = 0 then 'ما يشوف شي (صح)' else 'يشوف ' || n || ' ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يقرا الرسائل: ممنوع (صح)';
  end;

  begin
    delete from public.profiles where id = user_id;
    get diagnostics rows_changed = row_count;
    report := report || E'\n2 مستخدم مسجّل يحذف صفه في profiles: ' || case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يحذف صفه في profiles: ممنوع (صح)';
  end;

  begin
    select count(*) into n from public.user_games;
    report := report || E'\n2 مستخدم مسجّل يقرا user_games: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يقرا user_games: ممنوع (صح، من 0011)';
  end;

  -- ============================ 3) الأدمن ============================
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated', 'app_metadata', json_build_object('provider', 'email', 'role', 'admin'))::text, true);
  perform set_config('role', 'authenticated', true);
  report := report || E'\n3 (الدور الفعلي: ' || current_user || '، أدمن)';

  begin
    insert into public.aw_questions (category, question, options, answer, difficulty)
    select category, question || ' ' || marker, options, answer, difficulty from public.aw_questions limit 1;
    report := report || E'\n3 أدمن يضيف سؤال: مسموح (صح)';
  exception when others then
    report := report || E'\n3 أدمن يضيف سؤال: ممنوع ← صفحة الأدمن تتعطل (' || sqlerrm || ')';
  end;

  begin
    update public.aw_questions set question = question where id::text = q_id;
    get diagnostics rows_changed = row_count;
    report := report || E'\n3 أدمن يعدّل سؤال: ' || case when rows_changed = 1 then 'مسموح (صح)' else 'ما تغيّر ← صفحة الأدمن تتعطل' end;
  exception when others then
    report := report || E'\n3 أدمن يعدّل سؤال: ممنوع ← صفحة الأدمن تتعطل (' || sqlerrm || ')';
  end;

  begin
    delete from public.aw_questions where question like '%' || marker;
    get diagnostics rows_changed = row_count;
    report := report || E'\n3 أدمن يحذف سؤال: ' || case when rows_changed >= 1 then 'مسموح (صح)' else 'ما انحذف ← صفحة الأدمن تتعطل' end;
  exception when others then
    report := report || E'\n3 أدمن يحذف سؤال: ممنوع ← صفحة الأدمن تتعطل (' || sqlerrm || ')';
  end;

  begin
    update public.wd_countries set name = name where true;
    get diagnostics rows_changed = row_count;
    report := report || E'\n3 أدمن يعدّل دول السيطرة: ' || case when rows_changed > 0 then 'مسموح (صح)' else 'ما تغيّر ← صفحة الأدمن تتعطل' end;
  exception when others then
    report := report || E'\n3 أدمن يعدّل دول السيطرة: خطأ (' || sqlerrm || ')';
  end;

  begin
    select count(*) into n from public.contact_messages where message = marker;
    report := report || E'\n3 أدمن يقرا الرسائل: ' || case when n >= 1 then 'يشوف الرسالة التجريبية (صح)' else 'ما يشوفها ← صفحة الرسائل تتعطل' end;
  exception when others then
    report := report || E'\n3 أدمن يقرا الرسائل: ممنوع ← صفحة الرسائل تتعطل (' || sqlerrm || ')';
  end;

  begin
    delete from public.contact_messages where message = marker;
    get diagnostics rows_changed = row_count;
    report := report || E'\n3 أدمن يحذف رسالة: ' || case when rows_changed >= 1 then 'مسموح (صح)' else 'ما انحذف ← صفحة الرسائل تتعطل' end;
  exception when others then
    report := report || E'\n3 أدمن يحذف رسالة: ممنوع ← صفحة الرسائل تتعطل (' || sqlerrm || ')';
  end;

  -- ========================= 4) مفتاح الخدمة =========================
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    perform set_config('role', 'service_role', true);
    switched := current_user = 'service_role';
  exception when others then
    switched := false;
  end;
  if switched then
    begin
      select count(*) into n from public.quiz_questions;
      report := report || E'\n4 service_role يقرا أسئلة تحدي الفئات: مسموح (' || n || ' صف) (صح)';
    exception when others then
      report := report || E'\n4 service_role يقرا أسئلة تحدي الفئات: ممنوع ← تحدي الفئات يتعطل (' || sqlerrm || ')';
    end;
    begin
      select count(*) into n from public.contact_messages;
      report := report || E'\n4 service_role يقرا الرسائل: مسموح (صح)';
    exception when others then
      report := report || E'\n4 service_role يقرا الرسائل: ممنوع (' || sqlerrm || ')';
    end;
  else
    report := report || E'\n4 ما قدرت أجرب بدور service_role هنا (تخطيته)';
  end if;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%', report;
end;
$$;
