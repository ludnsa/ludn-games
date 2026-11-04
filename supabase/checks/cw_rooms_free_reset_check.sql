-- ============================================================================
-- فحص صلاحيات free_reset على قاعدة الإنتاج. ما يغيّر شي.
--
-- شغّله بعد 0010_cw_rooms_free_reset.sql، في SQL Editor.
-- يجرب على آخر غرفة بأدوار حقيقية (صاحب الغرفة، حساب ثاني، جوال بدون حساب)،
-- ويمر من سياسات RLS الحالية مثل الطلب الحقيقي.
--
-- النتيجة تطلع كرسالة خطأ حمراء، وهذا مقصود: الخطأ في آخره يلغي كل تجارب الفحص،
-- فما يبقى منها شي في القاعدة. انسخ الرسالة كاملة وأرسلها.
-- ============================================================================

do $$
declare
  room record;
  other_user constant uuid := '00000000-0000-4000-8000-00000000abcd';
  test_code constant text := 'ZZCHK';
  report text := '';
  rows_changed int;
  current_value text;
begin
  select room_code, created_by into room
    from public.cw_rooms
    where created_by is not null
    order by created_at desc
    limit 1;
  if room is null then
    raise exception 'ما فيه غرف أجرب عليها';
  end if;
  update public.cw_rooms set free_reset = 'none' where room_code = room.room_code;

  -- 1) حساب ثاني: لازم ينمنع
  perform set_config('request.jwt.claims', json_build_object('sub', other_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    update public.cw_rooms set free_reset = 'credit' where room_code = room.room_code and free_reset = 'none';
    get diagnostics rows_changed = row_count;
    report := report || E'\n1 حساب ثاني يغيّر free_reset: ' || case when rows_changed = 0 then 'ممنوع (RLS)' else 'مسموح ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n1 حساب ثاني يغيّر free_reset: ممنوع';
  end;

  -- 2) حساب ثاني يسجّل الغرفة باسمه: لازم ينمنع
  begin
    update public.cw_rooms set created_by = other_user where room_code = room.room_code;
    get diagnostics rows_changed = row_count;
    report := report || E'\n2 حساب ثاني يغيّر صاحب الغرفة: ' || case when rows_changed = 0 then 'ممنوع (RLS)' else 'مسموح ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n2 حساب ثاني يغيّر صاحب الغرفة: ممنوع';
  end;

  -- 3) جوال بدون حساب: لازم ينمنع من free_reset
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
  begin
    update public.cw_rooms set free_reset = 'credit' where room_code = room.room_code and free_reset = 'none';
    get diagnostics rows_changed = row_count;
    report := report || E'\n3 جوال بدون حساب يغيّر free_reset: ' || case when rows_changed = 0 then 'ممنوع (RLS)' else 'مسموح ← مشكلة' end;
  exception when insufficient_privilege then
    report := report || E'\n3 جوال بدون حساب يغيّر free_reset: ممنوع';
  end;

  -- 4) نفس الجوال يكتب التوزيع: لازم يبقى شغال مثل اليوم
  begin
    update public.cw_rooms set live_sync = coalesce(live_sync, '{}'::jsonb) where room_code = room.room_code;
    get diagnostics rows_changed = row_count;
    report := report || E'\n4 جوال بدون حساب يكتب بيانات اللعبة: ' || case when rows_changed = 1 then 'مسموح (صح)' else 'ممنوع ← الجوالات تتعطل' end;
  exception when others then
    report := report || E'\n4 جوال بدون حساب يكتب بيانات اللعبة: ممنوع ← الجوالات تتعطل (' || sqlerrm || ')';
  end;

  -- 5) صاحب الغرفة: none ثم credit، لازم ينجح
  perform set_config('request.jwt.claims', json_build_object('sub', room.created_by, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    update public.cw_rooms set free_reset = 'credit' where room_code = room.room_code and free_reset = 'none';
    get diagnostics rows_changed = row_count;
    report := report || E'\n5 صاحب الغرفة none إلى credit: ' || case when rows_changed = 1 then 'مسموح (صح)' else 'ممنوع ← مشكلة' end;
  exception when others then
    report := report || E'\n5 صاحب الغرفة none إلى credit: ممنوع ← مشكلة (' || sqlerrm || ')';
  end;

  -- 6) نفس التغيير مرة ثانية (تبويب ثاني): ما يلقى صف، فالمجاني ما يتكرر
  update public.cw_rooms set free_reset = 'credit' where room_code = room.room_code and free_reset = 'none';
  get diagnostics rows_changed = row_count;
  report := report || E'\n6 المجاني مرة ثانية: ' || case when rows_changed = 0 then 'ما ينعطى (صح)' else 'انعطى ← مشكلة' end;

  -- 7) صاحب الغرفة: credit ثم used، لازم ينجح
  begin
    update public.cw_rooms set free_reset = 'used' where room_code = room.room_code and free_reset = 'credit';
    get diagnostics rows_changed = row_count;
    report := report || E'\n7 صاحب الغرفة credit إلى used: ' || case when rows_changed = 1 then 'مسموح (صح)' else 'ممنوع ← مشكلة' end;
  exception when others then
    report := report || E'\n7 صاحب الغرفة credit إلى used: ممنوع ← مشكلة (' || sqlerrm || ')';
  end;

  -- 8) صاحب الغرفة يرجّعها none: لازم ينمنع
  begin
    update public.cw_rooms set free_reset = 'none' where room_code = room.room_code;
    report := report || E'\n8 صاحب الغرفة يرجّعها none: مسموح ← مشكلة';
  exception when insufficient_privilege then
    report := report || E'\n8 صاحب الغرفة يرجّعها none: ممنوع (صح)';
  end;

  -- 9) إنشاء غرفة فيها مجاني جاهز: لازم ترجع none
  begin
    insert into public.cw_rooms (room_code, live_sync, free_reset) values (test_code, '{}'::jsonb, 'credit');
    select free_reset into current_value from public.cw_rooms where room_code = test_code;
    report := report || E'\n9 إنشاء غرفة بمجاني جاهز: تنحفظ ' || coalesce(current_value, 'بدون قراءة') || case when current_value = 'none' then ' (صح)' else ' ← مشكلة' end;
  exception when others then
    report := report || E'\n9 إنشاء غرفة من صاحب حساب: ممنوع ← مشكلة (' || sqlerrm || ')';
  end;

  raise exception E'نتيجة الفحص (ما تغيّر شي في القاعدة):%', report;
end;
$$;
