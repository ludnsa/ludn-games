-- ============================================================================
-- فحص 0015 على قاعدة الإنتاج بأدوار حقيقية. ما يغيّر شي.
--
-- شغّله بعد 0015_game_sessions.sql، في SQL Editor.
-- القسم 0 يقرا الصلاحيات نفسها. المتوقع:
--   game_sessions: الحماية مفعّلة، وولا صلاحية لـ anon و authenticated
--   الدوال الإحدى عشر: ما ينفذها المتصفح، وينفذها service_role
-- بعدها يجرب الدوال بدور service_role (طريق الموقع) على حساب حقيقي ما عنده اشتراك،
-- بألعاب وهمية أسماؤها تبدأ بـ zz-check (ما تلمس أي لعبة حقيقية)، ويجرب:
--   1 التجربة: حجز، والضغطة الثانية تنرفض، والإنهاء البدري يرجعها مرتين، والثالثة تنحسب
--   2 الجزء الحقيقي: تنحسب، والإنهاء بعدها ما يغيّر شي
--   3 العشر دقايق: تنحسب لو صاحبها موجود
--   4 طلع من اللعبة (الصفحة سكرت أكثر من 3 دقايق): ترجع لما يبدأ لعبة ثانية
--   5 الرصيد القديم: ينخصم مع الحجز ويرجع مع الإرجاع
--   6 إلغاء حجز ما بدأت لعبته: كأنه ما صار
--   7 المشترك: يبدأ أكثر من لعبة بنفس الوقت وكل وحدة تنحسب على طول، بدون حجز
--   8 المتصفح (مستخدم مسجّل وزائر): ممنوع من الجدول والدوال
--
-- النتيجة تطلع كرسالة خطأ حمراء، وهذا مقصود: الخطأ في آخره يلغي كل تجارب الفحص
-- (الصفوف والرصيد والاشتراك التجريبي)، فما يبقى منها شي في القاعدة.
-- انسخ الرسالة كاملة وأرسلها.
-- ============================================================================

do $$
declare
  report text := '';
  u uuid;
  j jsonb;
  j2 jsonb;
  n bigint;
  played integer;
  tok integer;
  sid uuid;
  switched boolean := false;
  rl text;
  p text;
  privs text;
  privlist text[] := array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  -- 0) الصلاحيات المسجّلة فعلياً
  if current_setting('server_version_num')::int >= 170000 then
    privlist := privlist || 'MAINTAIN'::text;
  end if;
  report := report || E'\n0 الحماية (RLS) على game_sessions: '
    || case when (select c.relrowsecurity from pg_class c where c.oid = 'public.game_sessions'::regclass)
            then 'مفعّلة (صح)' else 'مطفية ← مشكلة' end;
  foreach rl in array array['anon', 'authenticated'] loop
    privs := '';
    foreach p in array privlist loop
      if has_table_privilege(rl, 'public.game_sessions', p) then
        privs := privs || case when privs = '' then '' else ', ' end || p;
      end if;
    end loop;
    foreach p in array array['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] loop
      if has_any_column_privilege(rl, 'public.game_sessions', p) and not has_table_privilege(rl, 'public.game_sessions', p) then
        privs := privs || case when privs = '' then '' else ', ' end || p || ' (عمود)';
      end if;
    end loop;
    report := report || E'\n0 صلاحيات ' || rl || ' على game_sessions: '
      || case when privs = '' then 'ولا شي (صح)' else privs || ' ← مشكلة' end;
    select count(*) into n
      from pg_proc f join pg_namespace s on s.oid = f.pronamespace
     where s.nspname = 'public' and f.proname like 'game\_session\_%'
       and has_function_privilege(rl, f.oid, 'EXECUTE');
    report := report || E'\n0 دوال ينفذها ' || rl || ': ' || n
      || case when n = 0 then ' (صح)' else ' ← مشكلة' end;
  end loop;
  select count(*) into n
    from pg_proc f join pg_namespace s on s.oid = f.pronamespace
   where s.nspname = 'public' and f.proname like 'game\_session\_%'
     and has_function_privilege('service_role', f.oid, 'EXECUTE');
  report := report || E'\n0 دوال ينفذها service_role: ' || n || ' من 11'
    || case when n = 11 then ' (صح)' else ' ← مشكلة' end;

  -- حساب حقيقي ما عنده اشتراك فعّال (كل اللي يصير له ينلغى بالنهاية)
  select au.id into u
    from auth.users au
   where not exists (select 1 from public.user_subscriptions s where s.user_id = au.id and s.ends_at > now())
     and exists (select 1 from public.profiles pr where pr.id = au.id)
   order by au.created_at desc
   limit 1;
  if u is null then
    raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%\nما لقيت حساب بدون اشتراك أجرب عليه.', report;
  end if;

  -- مفتاح الخدمة: طريق الموقع
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    perform set_config('role', 'service_role', true);
    switched := current_user = 'service_role';
  exception when others then
    switched := false;
  end;
  report := report || E'\n0 الدور اللي تجربت فيه الدوال: ' || current_user
    || case when switched then ' (صح)' else ' (ما قدرت أبدّل لـ service_role، النتائج بدور المالك)' end;

  update public.profiles set available_tokens = 0 where id = u;

  -- 1) التجربة
  j := public.game_session_begin(u, 'zz-check-a', 'ZA1');
  report := report || E'\n1 ابدأ: ' || case when (j ->> 'ok')::boolean and j ->> 'kind' = 'trial'
    then 'انحجزت التجربة (صح)' else '← مشكلة ' || j::text end;
  j := public.game_session_begin(u, 'zz-check-a', 'ZA2');
  report := report || E'\n1 ابدأ ثانية والأولى شغالة: ' || case when j ->> 'reason' = 'busy'
    then 'مرفوضة (صح)' else '← مشكلة ' || j::text end;
  j := public.game_session_end('zz-check-a', 'ZA1');
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-a';
  report := report || E'\n1 أنهى بدري (1): ' || case when j ->> 'result' = 'released' and played = 0
    then 'رجعت التجربة (صح)' else '← مشكلة ' || j::text || ' played=' || played end;
  j := public.game_session_begin(u, 'zz-check-a', 'ZA2');
  j2 := public.game_session_end('zz-check-a', 'ZA2');
  report := report || E'\n1 أنهى بدري (2): ' || case when (j ->> 'ok')::boolean and j2 ->> 'result' = 'released'
    then 'رجعت التجربة (صح)' else '← مشكلة ' || j::text || ' ' || j2::text end;
  j := public.game_session_begin(u, 'zz-check-a', 'ZA3');
  j2 := public.game_session_end('zz-check-a', 'ZA3');
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-a';
  report := report || E'\n1 أنهى بدري (3): ' || case when (j ->> 'ok')::boolean and j2 ->> 'outcome' = 'cap' and played = 1
    then 'انحسبت (صح)' else '← مشكلة ' || j::text || ' ' || j2::text || ' played=' || played end;
  j := public.game_session_begin(u, 'zz-check-a', 'ZA4');
  report := report || E'\n1 ابدأ بعد ما خلصت التجربة وبدون رصيد: ' || case when j ->> 'reason' = 'no_access'
    then 'مرفوضة (صح)' else '← مشكلة ' || j::text end;

  -- 2) الجزء الحقيقي
  j := public.game_session_begin(u, 'zz-check-b', 'ZB1');
  j2 := public.game_session_count('zz-check-b', 'ZB1');
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-b';
  report := report || E'\n2 وصل الجزء الحقيقي: ' || case when (j2 ->> 'counted')::boolean and played = 1
    then 'انحسبت (صح)' else '← مشكلة ' || j2::text || ' played=' || played end;
  j2 := public.game_session_end('zz-check-b', 'ZB1');
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-b';
  report := report || E'\n2 أنهى بعدها: ' || case when j2 ->> 'result' = 'none' and played = 1
    then 'ما تغيّر شي (صح)' else '← مشكلة ' || j2::text end;

  -- 3) العشر دقايق
  j := public.game_session_begin(u, 'zz-check-c', 'ZC1');
  update public.game_sessions set started_at = now() - interval '11 minutes', last_seen = now() - interval '50 seconds'
   where id = (j ->> 'session_id')::uuid;
  j2 := public.game_session_ping(u, 'zz-check-c', 'ZC1');
  report := report || E'\n3 الصفحة مفتوحة وفات 10 دقايق: ' || case when j2 ->> 'status' = 'counted'
    then 'انحسبت (صح)' else '← مشكلة ' || j2::text end;
  j := public.game_session_begin(u, 'zz-check-c2', 'ZC2');
  update public.game_sessions set started_at = now() - interval '11 minutes', last_seen = now() - interval '1 minute'
   where id = (j ->> 'session_id')::uuid;
  j2 := public.game_session_end('zz-check-c2', 'ZC2');
  report := report || E'\n3 أنهى بعد 10 دقايق: ' || case when j2 ->> 'outcome' = 'time'
    then 'انحسبت (صح)' else '← مشكلة ' || j2::text end;
  j := public.game_session_begin(u, 'zz-check-c3', 'ZC3');
  update public.game_sessions set started_at = now() - interval '20 minutes', last_seen = now() - interval '9 minutes'
   where id = (j ->> 'session_id')::uuid;
  j2 := public.game_session_access(u, 'zz-check-c3');
  report := report || E'\n3 كان موجود لين فاتت 10 دقايق وبعدها طلع: ' || case when j2 ->> 'reason' = 'no_tokens'
    then 'انحسبت (صح)' else '← مشكلة ' || j2::text end;

  -- 4) طلع من اللعبة
  j := public.game_session_begin(u, 'zz-check-d', 'ZD1');
  update public.game_sessions set started_at = now() - interval '5 minutes', last_seen = now() - interval '4 minutes'
   where id = (j ->> 'session_id')::uuid;
  j2 := public.game_session_access(u, 'zz-check-d');
  report := report || E'\n4 الصفحة سكرت من 4 دقايق، فحص الوصول: ' || case when j2 ->> 'reason' = 'free_trial' and not (j2 ->> 'busy')::boolean
    then 'التجربة متاحة (صح)' else '← مشكلة ' || j2::text end;
  j2 := public.game_session_begin(u, 'zz-check-d', 'ZD2');
  select count(*) into n from public.game_sessions where user_id = u and game_id = 'zz-check-d' and room_ref = 'ZD1' and status = 'released' and outcome = 'abandoned';
  report := report || E'\n4 بدأ لعبة ثانية: ' || case when (j2 ->> 'ok')::boolean and j2 ->> 'kind' = 'trial' and j2 -> 'released' = '["ZD1"]'::jsonb and n = 1
    then 'رجعت الأولى وانحجزت الثانية، والموقع يقفل غرفة ZD1 (صح)' else '← مشكلة ' || j2::text end;
  j := public.game_session_begin(u, 'zz-check-d2', 'ZD3');
  update public.game_sessions set started_at = now() - interval '2 minutes', last_seen = now() - interval '1 minute'
   where id = (j ->> 'session_id')::uuid;
  j2 := public.game_session_begin(u, 'zz-check-d2', 'ZD4');
  report := report || E'\n4 الأولى صفحتها مفتوحة (من دقيقة) وبدأ ثانية: ' || case when j2 ->> 'reason' = 'busy'
    then 'مرفوضة (صح)' else '← مشكلة ' || j2::text end;

  -- 5) الرصيد القديم (التجربة مستخدمة من قبل)
  insert into public.user_games (user_id, game_id, games_played, is_purchased) values (u, 'zz-check-e', 1, false);
  update public.profiles set available_tokens = 1 where id = u;
  j := public.game_session_begin(u, 'zz-check-e', 'ZE1');
  select available_tokens into tok from public.profiles where id = u;
  report := report || E'\n5 ابدأ من الرصيد: ' || case when (j ->> 'ok')::boolean and j ->> 'kind' = 'token' and tok = 0
    then 'انخصمت لعبة مع الحجز (صح)' else '← مشكلة ' || j::text || ' tokens=' || tok end;
  j2 := public.game_session_end('zz-check-e', 'ZE1');
  select available_tokens into tok from public.profiles where id = u;
  report := report || E'\n5 أنهى بدري: ' || case when j2 ->> 'result' = 'released' and tok = 1
    then 'رجعت اللعبة للرصيد (صح)' else '← مشكلة ' || j2::text || ' tokens=' || tok end;
  update public.profiles set available_tokens = 0 where id = u;

  -- 6) إلغاء حجز ما بدأت لعبته
  j := public.game_session_begin(u, 'zz-check-f', 'ZF1');
  j2 := public.game_session_cancel((j ->> 'session_id')::uuid);
  select count(*) into n from public.game_sessions where user_id = u and game_id = 'zz-check-f';
  j := public.game_session_begin(u, 'zz-check-f', 'ZF2');
  report := report || E'\n6 البدء فشل بعد الحجز: ' || case when (j2 ->> 'cancelled')::boolean and n = 0 and j ->> 'kind' = 'trial'
    then 'الحجز انلغى والتجربة متاحة (صح)' else '← مشكلة ' || j2::text || ' rows=' || n end;

  -- 7) المشترك (آخر شي: الاشتراك التجريبي يأثر على اللي بعده)
  insert into public.user_subscriptions (user_id, ends_at) values (u, now() + interval '1 day')
  on conflict (user_id) do update set ends_at = excluded.ends_at;
  j := public.game_session_begin(u, 'zz-check-g', 'ZG1');
  j2 := public.game_session_begin(u, 'zz-check-g', 'ZG2');
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-g';
  select count(*) into n from public.game_sessions where user_id = u and game_id = 'zz-check-g' and status = 'reserved';
  report := report || E'\n7 المشترك يبدأ لعبتين بنفس الوقت: ' || case when j ->> 'kind' = 'subscription' and j2 ->> 'kind' = 'subscription' and played = 2 and n = 0
    then 'الثنتين بدأت وانحسبت على طول، بدون حجز (صح)' else '← مشكلة ' || j::text || ' ' || j2::text || ' played=' || played end;
  j := public.game_session_access(u, 'zz-check-a');
  report := report || E'\n7 المشترك بعد ما خلصت تجربته: ' || case when (j ->> 'allowed')::boolean and j ->> 'reason' = 'subscription'
    then 'يلعب عادي (صح)' else '← مشكلة ' || j::text end;
  sid := (j2 ->> 'session_id')::uuid;
  j := public.game_session_cancel(sid);
  select coalesce(max(games_played), 0) into played from public.user_games where user_id = u and game_id = 'zz-check-g';
  report := report || E'\n7 المشترك والبدء فشل: ' || case when (j ->> 'cancelled')::boolean and played = 1
    then 'ما انحسبت (صح)' else '← مشكلة ' || j::text || ' played=' || played end;

  -- 8) المتصفح
  foreach rl in array array['authenticated', 'anon'] loop
    perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', rl)::text, true);
    perform set_config('role', rl, true);
    begin
      select count(*) into n from public.game_sessions;
      report := report || E'\n8 ' || rl || ' يقرا الجلسات: مسموح ← مشكلة';
    exception when insufficient_privilege then
      report := report || E'\n8 ' || rl || ' يقرا الجلسات: ممنوع (صح)';
    end;
    begin
      j := public.game_session_begin(u, 'zz-check-h', 'ZH1');
      report := report || E'\n8 ' || rl || ' يحجز بنفسه: مسموح ← مشكلة';
    exception when insufficient_privilege then
      report := report || E'\n8 ' || rl || ' يحجز بنفسه: ممنوع (صح)';
    end;
    begin
      j := public.game_session_end('zz-check-a', 'ZA4');
      report := report || E'\n8 ' || rl || ' يرجّع تجربة بنفسه: مسموح ← مشكلة';
    exception when insufficient_privilege then
      report := report || E'\n8 ' || rl || ' يرجّع تجربة بنفسه: ممنوع (صح)';
    end;
  end loop;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%', report;
end;
$$;
