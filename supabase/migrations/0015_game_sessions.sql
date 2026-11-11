-- =====================================================================
-- 0015_game_sessions.sql
-- جلسات اللعب: التجربة المجانية (والرصيد القديم) ما تنحرق لحظة "ابدأ".
--
-- قبل: "ابدأ" يزيد عدّاد اللعب (user_games.games_played) على طول، فلو أنهى
--   اللعبة بعد دقيقة راحت تجربته. والفحص والزيادة خطوتين منفصلتين، فضغطتين
--   بنفس اللحظة من جهازين تطلع لعبتين بتجربة وحدة.
-- بعد (للألعاب اللي تنتقل للنظام الجديد، أولها المافيا):
--   1) "ابدأ" يحجز التجربة (أو لعبة من الرصيد القديم) بخطوة وحدة، وحجز واحد
--      بس لكل لعبة لكل حساب. لو ما انحجز، اللعبة ما تبدأ.
--   2) تنحسب بأول وحدة من:
--      - اللعبة وصلت "الجزء الحقيقي" (المافيا: أول صباح، أو انتهت بفائز).
--      - مرّت 10 دقايق من البدء وصاحب اللعبة موجود (فاتح الصفحة).
--   3) ترجع لو أنهى أو صفّر قبلها، أو طلع (صفحته سكرت أكثر من 3 دقايق) وبدأ
--      لعبة ثانية. بحد أقصى مرتين لكل لعبة لكل حساب، وبعدها أي إنهاء بدري ينحسب.
--   4) الرصيد القديم: اللعبة تنخصم مع الحجز، وترجع للرصيد لو رجعت الجلسة.
--   5) المشترك وشاري اللعبة: مثل قبل بالضبط، تنحسب على طول بدون حجز ولا قيود.
--
-- جدول جديد (game_sessions) ودوال جديدة، وما يغيّر ولا جدول موجود.
-- الجدول للسيرفر بس (مفتاح الخدمة): RLS مفعّل بدون أي سياسة، وصلاحيات المتصفح
-- مسحوبة مثل 0011. والدوال ما ينفذها إلا service_role.
--
-- قبل التشغيل: شغّل supabase/checks/0015_status.sql وأرسل لي النتيجة.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك صف واحد للتأكد.
-- بعد التشغيل: شغّل supabase/checks/0015_game_sessions_check.sql
--   (يجرب بأدوار حقيقية ويلغي كل تجاربه).
-- التراجع: supabase/rollback/0015_game_sessions_rollback.sql
--   (بعد ما نرجّع كود المافيا، لأن الكود الجديد يعتمد على الجدول).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) الجدول: كل "ابدأ" صف
-- ---------------------------------------------------------------------
create table if not exists public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  game_id     text not null,
  -- كود الغرفة (المافيا: كود الغرفة نفسه)
  room_ref    text not null,
  -- trial = التجربة المجانية، token = لعبة من الرصيد القديم،
  -- subscription = اشتراك فعّال، purchased = شاري اللعبة مدى الحياة
  kind        text not null,
  -- reserved = محجوزة (اللعبة شغالة)، counted = انحسبت، released = رجعت
  status      text not null default 'reserved',
  -- ليش انحسبت أو رجعت: milestone (وصلت الجزء الحقيقي)، time (10 دقايق)،
  -- cap (خلص حد الإرجاع)، ended (أنهاها بدري)، abandoned (طلع وبدأ لعبة ثانية)،
  -- direct (اشتراك أو شراء: تنحسب على طول)
  outcome     text,
  started_at  timestamptz not null default now(),
  -- آخر مرة صاحب اللعبة كان فاتح الصفحة (الصفحة ترسل كل دقيقة قبل الجزء الحقيقي)
  last_seen   timestamptz not null default now(),
  settled_at  timestamptz,

  constraint game_sessions_game_chk    check (game_id ~ '^[a-z0-9-]{1,40}$'),
  constraint game_sessions_room_chk    check (length(room_ref) between 1 and 64),
  constraint game_sessions_kind_chk    check (kind in ('trial', 'token', 'subscription', 'purchased')),
  constraint game_sessions_status_chk  check (status in ('reserved', 'counted', 'released')),
  constraint game_sessions_outcome_chk check (outcome is null or outcome in ('milestone', 'time', 'cap', 'ended', 'abandoned', 'direct')),
  -- الحجز للتجربة والرصيد بس. المشترك والشاري تنحسب على طول
  constraint game_sessions_reserved_chk check (status <> 'reserved' or kind in ('trial', 'token'))
);

-- حجز واحد بس لكل لعبة لكل حساب (الضمان الأخير ضد الضغط بنفس اللحظة)
create unique index if not exists game_sessions_one_reserved_uidx
  on public.game_sessions (user_id, game_id) where status = 'reserved';
-- البحث بالغرفة (الاحتساب والإنهاء)
create index if not exists game_sessions_room_idx
  on public.game_sessions (game_id, room_ref) where status = 'reserved';
-- عدد مرات الإرجاع
create index if not exists game_sessions_user_game_idx
  on public.game_sessions (user_id, game_id, status);

-- الحماية: مفعّلة بدون أي سياسة، وصلاحيات المتصفح مسحوبة (Supabase يعطيها لأي جدول جديد)
alter table public.game_sessions enable row level security;
revoke all on table public.game_sessions from anon, authenticated, public;
grant select, insert, update, delete on table public.game_sessions to service_role;

-- ---------------------------------------------------------------------
-- 2) القواعد بمكان واحد
-- ---------------------------------------------------------------------
create or replace function public.game_session_rules(
  out time_limit interval,
  out idle_limit interval,
  out max_releases integer
)
language sql
immutable
set search_path = ''
as $$
  select interval '10 minutes', interval '3 minutes', 2
$$;

-- قفل لكل حساب + لعبة: الطلبات اللي بنفس اللحظة تمشي وحدة ورا الثانية
create or replace function public.game_session_lock(p_user uuid, p_game text)
returns void
language sql
volatile
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('game_session:' || p_user::text || ':' || p_game, 0))
$$;

-- عدّاد اللعب (نفس العمود اللي تقراه صفحة "ألعابي" وفحص التجربة القديم)
create or replace function public.game_session_bump(p_user uuid, p_game text, p_delta integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.user_games
     set games_played = greatest(coalesce(games_played, 0) + p_delta, 0)
   where user_id = p_user and game_id = p_game;
  if not found and p_delta > 0 then
    insert into public.user_games (user_id, game_id, games_played, is_purchased)
    values (p_user, p_game, p_delta, false);
  end if;
end;
$$;

-- يقفل جلسة محجوزة: counted تزيد العدّاد، released ترجّع لعبة الرصيد (لو كانت منه)
create or replace function public.game_session_close(p_id uuid, p_status text, p_outcome text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  s public.game_sessions;
begin
  update public.game_sessions
     set status = p_status, outcome = p_outcome, settled_at = now()
   where id = p_id and status = 'reserved'
  returning * into s;
  if not found then
    return false;
  end if;
  if p_status = 'counted' then
    perform public.game_session_bump(s.user_id, s.game_id, 1);
  elsif s.kind = 'token' then
    update public.profiles set available_tokens = coalesce(available_tokens, 0) + 1 where id = s.user_id;
  end if;
  return true;
end;
$$;

-- يصفّي الحجز القديم لهالحساب وهاللعبة:
--   فات 10 دقايق وصاحبه موجود        → تنحسب (time)
--   صفحته سكرت أكثر من 3 دقايق        → ترجع (abandoned) لو p_release، وإلا تبقى قابلة للإرجاع.
--                                        لو خلص حد الإرجاع: تنحسب (cap)
--   غير كذا                           → شغالة (active)
create or replace function public.game_session_settle(p_user uuid, p_game text, p_release boolean)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.game_sessions;
  rules record;
  released text[] := '{}';
  active boolean := false;
  releasable boolean := false;
begin
  select * into rules from public.game_session_rules();
  for r in
    select * from public.game_sessions
     where user_id = p_user and game_id = p_game and status = 'reserved'
     for update
  loop
    if r.last_seen >= r.started_at + rules.time_limit
       or (now() - r.started_at >= rules.time_limit and now() - r.last_seen <= rules.idle_limit) then
      perform public.game_session_close(r.id, 'counted', 'time');
    elsif now() - r.last_seen > rules.idle_limit then
      if (select count(*) from public.game_sessions g
           where g.user_id = p_user and g.game_id = p_game and g.status = 'released') >= rules.max_releases then
        perform public.game_session_close(r.id, 'counted', 'cap');
      elsif p_release then
        perform public.game_session_close(r.id, 'released', 'abandoned');
        released := released || r.room_ref;
      else
        releasable := true;
      end if;
    else
      active := true;
    end if;
  end loop;
  return jsonb_build_object('released', to_jsonb(released), 'active', active, 'releasable', releasable);
end;
$$;

-- ---------------------------------------------------------------------
-- 3) "ابدأ": الحجز
--    ok + session_id + kind، أو ok = false مع reason: busy (عنده لعبة شغالة) / no_access.
--    released = غرف حجوزاتها رجعت لأن صاحبها طلع منها (الموقع يقفلها).
-- ---------------------------------------------------------------------
create or replace function public.game_session_begin(p_user uuid, p_game text, p_room text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_purchased boolean;
  v_played integer;
  v_kind text;
  v_id uuid;
  settled jsonb;
begin
  perform public.game_session_lock(p_user, p_game);

  select coalesce(g.is_purchased, false), coalesce(g.games_played, 0)
    into v_purchased, v_played
    from public.user_games g
   where g.user_id = p_user and g.game_id = p_game
   limit 1;

  -- شاري اللعبة أو مشترك: مثل قبل، تنحسب على طول بدون حجز
  if coalesce(v_purchased, false) then
    v_kind := 'purchased';
  elsif exists (select 1 from public.user_subscriptions s where s.user_id = p_user and s.ends_at > now()) then
    v_kind := 'subscription';
  end if;
  if v_kind is not null then
    insert into public.game_sessions (user_id, game_id, room_ref, kind, status, outcome, settled_at)
    values (p_user, p_game, p_room, v_kind, 'counted', 'direct', now())
    returning id into v_id;
    perform public.game_session_bump(p_user, p_game, 1);
    return jsonb_build_object('ok', true, 'session_id', v_id, 'kind', v_kind, 'released', '[]'::jsonb);
  end if;

  -- تجربة أو رصيد: الحجز القديم أول
  settled := public.game_session_settle(p_user, p_game, true);
  if (settled ->> 'active')::boolean then
    return jsonb_build_object('ok', false, 'reason', 'busy', 'released', settled -> 'released');
  end if;

  -- (التصفية يمكن حسبت حجز قديم، فنقرا العدّاد من جديد)
  select coalesce(g.games_played, 0) into v_played
    from public.user_games g
   where g.user_id = p_user and g.game_id = p_game
   limit 1;

  if coalesce(v_played, 0) = 0 then
    v_kind := 'trial';
  else
    update public.profiles
       set available_tokens = available_tokens - 1
     where id = p_user and coalesce(available_tokens, 0) > 0;
    if found then
      v_kind := 'token';
    end if;
  end if;

  if v_kind is null then
    return jsonb_build_object('ok', false, 'reason', 'no_access', 'released', settled -> 'released');
  end if;

  insert into public.game_sessions (user_id, game_id, room_ref, kind)
  values (p_user, p_game, p_room, v_kind)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'session_id', v_id, 'kind', v_kind, 'released', settled -> 'released');
end;
$$;

-- ---------------------------------------------------------------------
-- 4) اللعبة وصلت الجزء الحقيقي: تنحسب
-- ---------------------------------------------------------------------
create or replace function public.game_session_count(p_game text, p_room text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.game_sessions;
begin
  select * into r from public.game_sessions
   where game_id = p_game and room_ref = p_room and status = 'reserved'
   limit 1;
  if not found then
    return jsonb_build_object('counted', false);
  end if;
  perform public.game_session_lock(r.user_id, p_game);
  return jsonb_build_object('counted', public.game_session_close(r.id, 'counted', 'milestone'));
end;
$$;

-- ---------------------------------------------------------------------
-- 5) أنهى أو صفّر قبل الجزء الحقيقي: ترجع (لو باقي له إرجاع)، وإلا تنحسب
-- ---------------------------------------------------------------------
create or replace function public.game_session_end(p_game text, p_room text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.game_sessions;
  rules record;
begin
  select * into r from public.game_sessions
   where game_id = p_game and room_ref = p_room and status = 'reserved'
   limit 1;
  if not found then
    return jsonb_build_object('result', 'none');
  end if;
  perform public.game_session_lock(r.user_id, p_game);
  select * into r from public.game_sessions where id = r.id and status = 'reserved' for update;
  if not found then
    return jsonb_build_object('result', 'none');
  end if;

  select * into rules from public.game_session_rules();
  if r.last_seen >= r.started_at + rules.time_limit
     or (now() - r.started_at >= rules.time_limit and now() - r.last_seen <= rules.idle_limit) then
    perform public.game_session_close(r.id, 'counted', 'time');
    return jsonb_build_object('result', 'counted', 'outcome', 'time');
  end if;
  if (select count(*) from public.game_sessions g
       where g.user_id = r.user_id and g.game_id = p_game and g.status = 'released') >= rules.max_releases then
    perform public.game_session_close(r.id, 'counted', 'cap');
    return jsonb_build_object('result', 'counted', 'outcome', 'cap');
  end if;
  perform public.game_session_close(r.id, 'released', 'ended');
  return jsonb_build_object('result', 'released', 'outcome', 'ended');
end;
$$;

-- ---------------------------------------------------------------------
-- 6) صاحب اللعبة فاتح الصفحة (كل دقيقة قبل الجزء الحقيقي). لو فات 10 دقايق: تنحسب
-- ---------------------------------------------------------------------
create or replace function public.game_session_ping(p_user uuid, p_game text, p_room text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.game_sessions;
  rules record;
begin
  perform public.game_session_lock(p_user, p_game);
  update public.game_sessions
     set last_seen = now()
   where user_id = p_user and game_id = p_game and room_ref = p_room and status = 'reserved'
  returning * into r;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;
  select * into rules from public.game_session_rules();
  if now() - r.started_at >= rules.time_limit then
    perform public.game_session_close(r.id, 'counted', 'time');
    return jsonb_build_object('status', 'counted');
  end if;
  return jsonb_build_object('status', 'reserved');
end;
$$;

-- ---------------------------------------------------------------------
-- 7) فحص الوصول (نفس ترتيب gameAccess.ts): شاري، اشتراك، تجربة، رصيد.
--    ما يرجّع حجوزات (ما يقفل غرف)، بس يحسب اللي خلص وقتها أو حدها.
-- ---------------------------------------------------------------------
create or replace function public.game_session_access(p_user uuid, p_game text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_purchased boolean;
  v_played integer;
  v_tokens integer;
  settled jsonb;
  busy boolean;
begin
  perform public.game_session_lock(p_user, p_game);

  select coalesce(p.available_tokens, 0) into v_tokens from public.profiles p where p.id = p_user;
  v_tokens := coalesce(v_tokens, 0);
  select coalesce(g.is_purchased, false) into v_purchased
    from public.user_games g
   where g.user_id = p_user and g.game_id = p_game
   limit 1;

  if coalesce(v_purchased, false) then
    return jsonb_build_object('allowed', true, 'reason', 'paid', 'tokens', v_tokens, 'busy', false);
  end if;
  if exists (select 1 from public.user_subscriptions s where s.user_id = p_user and s.ends_at > now()) then
    return jsonb_build_object('allowed', true, 'reason', 'subscription', 'tokens', v_tokens, 'busy', false);
  end if;

  settled := public.game_session_settle(p_user, p_game, false);
  busy := (settled ->> 'active')::boolean;
  select coalesce(g.games_played, 0) into v_played
    from public.user_games g
   where g.user_id = p_user and g.game_id = p_game
   limit 1;

  if coalesce(v_played, 0) = 0 then
    return jsonb_build_object('allowed', true, 'reason', 'free_trial', 'tokens', v_tokens, 'busy', busy);
  end if;
  -- عنده لعبة شغالة من رصيده (اللعبة منخصمة أصلاً) أو باقي له رصيد
  if busy or v_tokens > 0 then
    return jsonb_build_object('allowed', true, 'reason', 'paid', 'tokens', v_tokens, 'busy', busy);
  end if;
  return jsonb_build_object('allowed', false, 'reason', 'no_tokens', 'tokens', v_tokens, 'busy', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 8) إلغاء حجز ما بدأت لعبته أصلاً (الموقع حجز، وبعدها البدء فشل)
--    كأنه ما صار: ما ينحسب ولا ينعد إرجاع
-- ---------------------------------------------------------------------
create or replace function public.game_session_cancel(p_session uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.game_sessions;
begin
  select * into r from public.game_sessions where id = p_session;
  if not found then
    return jsonb_build_object('cancelled', false);
  end if;
  perform public.game_session_lock(r.user_id, r.game_id);
  select * into r from public.game_sessions where id = p_session for update;
  if not found then
    return jsonb_build_object('cancelled', false);
  end if;

  if r.status = 'reserved' then
    delete from public.game_sessions where id = r.id;
    if r.kind = 'token' then
      update public.profiles set available_tokens = coalesce(available_tokens, 0) + 1 where id = r.user_id;
    end if;
    return jsonb_build_object('cancelled', true);
  end if;
  if r.status = 'counted' and r.outcome = 'direct' then
    delete from public.game_sessions where id = r.id;
    perform public.game_session_bump(r.user_id, r.game_id, -1);
    return jsonb_build_object('cancelled', true);
  end if;
  return jsonb_build_object('cancelled', false);
end;
$$;

-- ---------------------------------------------------------------------
-- 9) الدوال للسيرفر بس (Supabase يعطي أي دالة جديدة للمتصفح تلقائياً)
-- ---------------------------------------------------------------------
revoke all on function public.game_session_rules()                      from public, anon, authenticated;
revoke all on function public.game_session_lock(uuid, text)              from public, anon, authenticated;
revoke all on function public.game_session_bump(uuid, text, integer)     from public, anon, authenticated;
revoke all on function public.game_session_close(uuid, text, text)       from public, anon, authenticated;
revoke all on function public.game_session_settle(uuid, text, boolean)   from public, anon, authenticated;
revoke all on function public.game_session_begin(uuid, text, text)       from public, anon, authenticated;
revoke all on function public.game_session_count(text, text)             from public, anon, authenticated;
revoke all on function public.game_session_end(text, text)               from public, anon, authenticated;
revoke all on function public.game_session_ping(uuid, text, text)        from public, anon, authenticated;
revoke all on function public.game_session_access(uuid, text)            from public, anon, authenticated;
revoke all on function public.game_session_cancel(uuid)                  from public, anon, authenticated;

grant execute on function public.game_session_rules()                    to service_role;
grant execute on function public.game_session_lock(uuid, text)            to service_role;
grant execute on function public.game_session_bump(uuid, text, integer)   to service_role;
grant execute on function public.game_session_close(uuid, text, text)     to service_role;
grant execute on function public.game_session_settle(uuid, text, boolean) to service_role;
grant execute on function public.game_session_begin(uuid, text, text)     to service_role;
grant execute on function public.game_session_count(text, text)           to service_role;
grant execute on function public.game_session_end(text, text)             to service_role;
grant execute on function public.game_session_ping(uuid, text, text)      to service_role;
grant execute on function public.game_session_access(uuid, text)          to service_role;
grant execute on function public.game_session_cancel(uuid)                to service_role;

commit;

-- الموقع (PostgREST) يشوف الدوال الجديدة على طول
notify pgrst, 'reload schema';

-- التأكد: rls_enabled = true، و anon_privs و authenticated_privs فاضية،
-- و service_role_privs فيها SELECT, INSERT, UPDATE, DELETE، و functions = 11،
-- و browser_can_execute = 0، و service_role_can_execute = 11.
select c.relrowsecurity as rls_enabled,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'game_sessions' and g.grantee = 'anon') as anon_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'game_sessions' and g.grantee = 'authenticated') as authenticated_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'game_sessions' and g.grantee = 'service_role') as service_role_privs,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'game\_session\_%') as functions,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'game\_session\_%'
           and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))) as browser_can_execute,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'game\_session\_%'
           and has_function_privilege('service_role', p.oid, 'EXECUTE')) as service_role_can_execute
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname = 'game_sessions';
