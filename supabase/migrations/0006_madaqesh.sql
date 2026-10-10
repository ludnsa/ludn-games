-- =====================================================================
-- 0006_madaqesh.sql
-- "حاسبة مداقش" — الجداول والصلاحيات والبث اللحظي
--
-- طريقة التشغيل: انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor ثم شغّله.
-- الملف قابل لإعادة التشغيل (idempotent) — تشغيله أكثر من مرة لا يسبب أخطاء.
--
-- كل شي في حاسبة مداقش مكشوف للكل (السوم والتوزيع والأرصدة)، فالجداول العامة
-- للقراءة بس. الكتابة كلها عبر Server Actions بصلاحية service role.
-- الشي الوحيد السري: مفتاح كل لاعب (madaqesh_secrets) — بدون أي سياسة.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الغرفة
-- ---------------------------------------------------------------------

create table if not exists public.madaqesh_rooms (
  room_code       text primary key,
  host_user_id    uuid not null,
  host_player_id  uuid,

  -- lobby | bidding | deciding | responding | showdown | result | ended | closed
  phase           text not null default 'lobby',
  -- يزيد مع كل تغيير — يمنع تنفيذ نفس الخطوة مرتين من أجهزة مختلفة
  phase_seq       integer not null default 0,
  phase_ends_at   timestamptz,

  -- { startBalance, targetAmount, maxBankrupts }
  settings        jsonb not null default '{}'::jsonb,

  round_number    integer not null default 0,
  -- حالة الجولة الحالية: الترتيب، السوم، القرار، الردود، النتيجة
  round           jsonb,

  winner_id       uuid,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists madaqesh_rooms_host_user_idx
  on public.madaqesh_rooms (host_user_id);

-- ---------------------------------------------------------------------
-- 2) اللاعبون والأرصدة
-- ---------------------------------------------------------------------

create table if not exists public.madaqesh_players (
  id            uuid primary key default gen_random_uuid(),
  room_code     text not null references public.madaqesh_rooms(room_code) on delete cascade,
  display_name  text not null,
  -- ترتيب اللعب (المنشئ يرتّبهم)
  seat          integer not null,
  balance       bigint not null default 0,
  bankrupts     integer not null default 0,
  is_out        boolean not null default false,
  -- لاعبون وهميون للتجربة على localhost فقط
  is_bot        boolean not null default false,
  joined_at     timestamptz not null default now(),

  unique (room_code, display_name)
);

create index if not exists madaqesh_players_room_idx
  on public.madaqesh_players (room_code);

-- ---------------------------------------------------------------------
-- 3) مفاتيح اللاعبين (مغلق تماماً)
-- ---------------------------------------------------------------------

create table if not exists public.madaqesh_secrets (
  player_id   uuid primary key references public.madaqesh_players(id) on delete cascade,
  room_code   text not null references public.madaqesh_rooms(room_code) on delete cascade,
  token       text not null unique
);

create index if not exists madaqesh_secrets_room_idx
  on public.madaqesh_secrets (room_code);

-- ---------------------------------------------------------------------
-- 4) سجل الجولات — للعرض وللتراجع عن آخر جولة
-- ---------------------------------------------------------------------

create table if not exists public.madaqesh_rounds (
  id          uuid primary key default gen_random_uuid(),
  room_code   text not null references public.madaqesh_rooms(room_code) on delete cascade,
  round       integer not null,
  -- { round: حالة الجولة كاملة, before: الأرصدة قبلها }
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists madaqesh_rounds_room_idx
  on public.madaqesh_rounds (room_code, round);

-- ---------------------------------------------------------------------
-- 5) رد لاعب (يرضى / يعترض / ينسحب / يكمل) — تحديث ذرّي
--    أكثر من لاعب يردون بنفس اللحظة، فنكتب الرد داخل round بأمر واحد
--    بدل "اقرأ ثم اكتب" اللي ممكن يضيّع رد واحد منهم.
-- ---------------------------------------------------------------------

create or replace function public.madaqesh_set_response(
  p_room_code text,
  p_round integer,
  p_player_id text,
  p_response text
) returns boolean
language sql
as $$
  with updated as (
    update public.madaqesh_rooms
    set round = jsonb_set(coalesce(round, '{}'::jsonb), array['responses', p_player_id], to_jsonb(p_response), true)
    where room_code = p_room_code
      and round_number = p_round
      and phase = 'responding'
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke all on function public.madaqesh_set_response(text, integer, text, text) from public, anon, authenticated;
grant execute on function public.madaqesh_set_response(text, integer, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 6) صلاحيات الصفوف (RLS)
-- ---------------------------------------------------------------------

alter table public.madaqesh_rooms   enable row level security;
alter table public.madaqesh_players enable row level security;
alter table public.madaqesh_secrets enable row level security;
alter table public.madaqesh_rounds  enable row level security;

drop policy if exists madaqesh_rooms_read on public.madaqesh_rooms;
create policy madaqesh_rooms_read
  on public.madaqesh_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists madaqesh_players_read on public.madaqesh_players;
create policy madaqesh_players_read
  on public.madaqesh_players for select
  to anon, authenticated
  using (true);

drop policy if exists madaqesh_rounds_read on public.madaqesh_rounds;
create policy madaqesh_rounds_read
  on public.madaqesh_rounds for select
  to anon, authenticated
  using (true);

-- madaqesh_secrets: RLS مفعّل بدون أي سياسة => مقصود.

-- ---------------------------------------------------------------------
-- 7) البث اللحظي (Realtime)
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'madaqesh_rooms'
  ) then
    alter publication supabase_realtime add table public.madaqesh_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'madaqesh_players'
  ) then
    alter publication supabase_realtime add table public.madaqesh_players;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8) تحديث updated_at تلقائياً
-- ---------------------------------------------------------------------

create or replace function public.madaqesh_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists madaqesh_rooms_set_updated_at on public.madaqesh_rooms;
create trigger madaqesh_rooms_set_updated_at
  before update on public.madaqesh_rooms
  for each row execute function public.madaqesh_set_updated_at();
