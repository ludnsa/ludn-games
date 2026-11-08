-- ============================================================================
-- فحص 0011 على قاعدة الإنتاج بأدوار حقيقية. ما يغيّر شي.
--
-- شغّله بعد 0011_lock_server_only_tables.sql، في SQL Editor.
-- يجرب الجداول الثلاثة بثلاث أدوار:
--   service_role   مفتاح الخدمة (طريق الموقع): لازم يقرا ويعدّل عادي
--   authenticated  مستخدم مسجّل، حتى صاحب الصف نفسه: لازم ينمنع من كل شي
--   anon           زائر بدون حساب: لازم ينمنع من كل شي
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
  fake_user constant uuid := '00000000-0000-4000-8000-00000000abcd';
  t text;
  r text;
  switched boolean := false;
begin
  -- صاحب صف حقيقي من user_games (نقراه قبل ما نبدّل الدور)
  select user_id into real_user from public.user_games order by created_at desc limit 1;

  -- 1) مفتاح الخدمة: طريق الموقع، لازم يشتغل
  --    (لو SQL Editor ما سمح بالتبديل لهالدور، نتخطى هالقسم بدل ما نجرب بدور المالك ونطلع نتيجة غلط)
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    perform set_config('role', 'service_role', true);
    switched := current_user = 'service_role';
  exception when others then
    switched := false;
  end;
  if not switched then
    report := report || E'\n1 ما قدرت أجرب بدور service_role هنا (تخطيته). جرّب بدء لعبة من الموقع بدال.';
  else
  foreach t in array array['user_games', 'transactions', 'quiz_session_questions'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      report := report || E'\n1 service_role يقرا ' || t || ': مسموح (' || n || ' صف) (صح)';
    exception when others then
      report := report || E'\n1 service_role يقرا ' || t || ': ممنوع ← الموقع يتعطل (' || sqlerrm || ')';
    end;
  end loop;
  begin
    update public.user_games set games_played = games_played where user_id = real_user;
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 service_role يعدّل عدّاد اللعب: ' || case when rows_changed > 0 then 'مسموح (صح)' else 'ما لقى صف' end;
  exception when others then
    report := report || E'\n1 service_role يعدّل عدّاد اللعب: ممنوع ← الموقع يتعطل (' || sqlerrm || ')';
  end;
  end if;

  -- 2) مستخدم مسجّل، وهو صاحب الصف نفسه: لازم ينمنع
  perform set_config('request.jwt.claims', json_build_object('sub', real_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  report := report || E'\n2 (الدور الفعلي: ' || current_user || ')';
  foreach t in array array['user_games', 'transactions', 'quiz_session_questions'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      report := report || E'\n2 مستخدم مسجّل يقرا ' || t || ': مسموح (' || n || ' صف) ← مشكلة';
    exception when insufficient_privilege then
      report := report || E'\n2 مستخدم مسجّل يقرا ' || t || ': ممنوع (صح)';
    when others then
      report := report || E'\n2 مستخدم مسجّل يقرا ' || t || ': خطأ ثاني (' || sqlerrm || ')';
    end;
  end loop;
  begin
    update public.user_games set is_purchased = true where user_id = real_user;
    get diagnostics rows_changed = row_count;
    r := case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
    report := report || E'\n2 مستخدم مسجّل يعطي نفسه شراء مدى الحياة: ' || r;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يعطي نفسه شراء مدى الحياة: ممنوع (صح)';
  when others then
    report := report || E'\n2 مستخدم مسجّل يعطي نفسه شراء مدى الحياة: خطأ ثاني (' || sqlerrm || ')';
  end;
  begin
    update public.user_games set games_played = 0 where user_id = real_user;
    get diagnostics rows_changed = row_count;
    r := case when rows_changed = 0 then 'ما تغيّر شي (صح)' else 'تغيّر ← مشكلة' end;
    report := report || E'\n2 مستخدم مسجّل يصفّر تجربته المجانية: ' || r;
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يصفّر تجربته المجانية: ممنوع (صح)';
  when others then
    report := report || E'\n2 مستخدم مسجّل يصفّر تجربته المجانية: خطأ ثاني (' || sqlerrm || ')';
  end;
  begin
    insert into public.transactions (payment_id, user_id, package_id, amount, currency, status, payment_method)
    values ('zzcheck-fake', real_user, 4, 0, 'SAR', 'paid', 'creditcard');
    report := report || E'\n2 مستخدم مسجّل يضيف دفعة مزيفة: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n2 مستخدم مسجّل يضيف دفعة مزيفة: ممنوع (صح)';
  when others then
    report := report || E'\n2 مستخدم مسجّل يضيف دفعة مزيفة: خطأ ثاني (' || sqlerrm || ')';
  end;

  -- 3) زائر بدون حساب: لازم ينمنع
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  report := report || E'\n3 (الدور الفعلي: ' || current_user || ')';
  foreach t in array array['user_games', 'transactions', 'quiz_session_questions'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      report := report || E'\n3 زائر يقرا ' || t || ': مسموح (' || n || ' صف) ← مشكلة';
    exception when insufficient_privilege then
      report := report || E'\n3 زائر يقرا ' || t || ': ممنوع (صح)';
    when others then
      report := report || E'\n3 زائر يقرا ' || t || ': خطأ ثاني (' || sqlerrm || ')';
    end;
  end loop;
  begin
    insert into public.user_games (user_id, game_id, games_played, is_purchased) values (fake_user, 'auction', 0, true);
    report := report || E'\n3 زائر يضيف شراء مدى الحياة: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n3 زائر يضيف شراء مدى الحياة: ممنوع (صح)';
  when others then
    report := report || E'\n3 زائر يضيف شراء مدى الحياة: خطأ ثاني (' || sqlerrm || ')';
  end;
  begin
    delete from public.transactions where user_id = real_user;
    get diagnostics rows_changed = row_count;
    r := case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
    report := report || E'\n3 زائر يحذف عمليات دفع: ' || r;
  exception when insufficient_privilege then
    report := report || E'\n3 زائر يحذف عمليات دفع: ممنوع (صح)';
  when others then
    report := report || E'\n3 زائر يحذف عمليات دفع: خطأ ثاني (' || sqlerrm || ')';
  end;
  begin
    delete from public.quiz_session_questions where true;
    get diagnostics rows_changed = row_count;
    r := case when rows_changed = 0 then 'ما انحذف شي (صح)' else 'انحذف ← مشكلة' end;
    report := report || E'\n3 زائر يحذف أسئلة الجلسات: ' || r;
  exception when insufficient_privilege then
    report := report || E'\n3 زائر يحذف أسئلة الجلسات: ممنوع (صح)';
  when others then
    report := report || E'\n3 زائر يحذف أسئلة الجلسات: خطأ ثاني (' || sqlerrm || ')';
  end;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%', report;
end;
$$;
