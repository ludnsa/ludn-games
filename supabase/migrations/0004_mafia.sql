-- =====================================================================
-- 0004_mafia.sql
-- لعبة "المافيا" — الجداول والصلاحيات والبث اللحظي
--
-- طريقة التشغيل: انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor ثم شغّله.
-- الملف قابل لإعادة التشغيل (idempotent) — تشغيله أكثر من مرة لا يسبب أخطاء.
--
-- ملاحظة أمنية مهمة:
--   أدوار اللاعبين وأفعال الليل والتصويت تعيش في جداول بدون أي سياسة للعميل
--   (mafia_secrets, mafia_actions, mafia_votes). لا anon ولا authenticated
--   يستطيع قراءتها — كل جهاز يطلب "ما يخصه فقط" عبر Server Action بمفتاحه السري.
--   الجداول المبثوثة لحظياً (mafia_rooms, mafia_players) لا تحتوي أي دور.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الغرفة — حالة عامة يراها الجميع
-- ---------------------------------------------------------------------

create table if not exists public.mafia_rooms (
  room_code       text primary key,
  host_user_id    uuid not null,
  host_player_id  uuid,

  -- lobby | reveal | night_act | night_done | morning | discussion | voting | vote_result | ended
  phase           text not null default 'lobby',
  -- doctor | mafia | detective | magician | journalist | suicide (أثناء الليل فقط)
  night_step      text,
  night_number    integer not null default 0,

  -- يزيد مع كل انتقال مرحلة — يمنع تنفيذ نفس الانتقال مرتين من أجهزة مختلفة
  phase_seq       integer not null default 0,
  -- مؤقت مبني على وقت الانتهاء بدل الكتابة كل ثانية
  phase_ends_at   timestamptz,

  -- { maxPlayers, mafiaCount, optionalRoles[] } — تركيبة الفئات معلنة للجميع
  settings        jsonb not null default '{}'::jsonb,

  -- نتائج الصباح المعلنة (بدون كشف أي دور إلا ما يكشفه الصحفي)
  announcements   jsonb not null default '[]'::jsonb,
  -- { "<player_id>": عدد, "skip": عدد }
  vote_counts     jsonb not null default '{}'::jsonb,
  vote_result     jsonb,

  -- mafia | town — تُملأ عند نهاية اللعبة فقط، ومعها كشف كل الأدوار
  winner          text check (winner in ('mafia', 'town')),
  final_roles     jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists mafia_rooms_host_user_idx
  on public.mafia_rooms (host_user_id);

-- ---------------------------------------------------------------------
-- 2) اللاعبون — معلومات عامة فقط (الاسم ومين حي)
-- ---------------------------------------------------------------------

create table if not exists public.mafia_players (
  id            uuid primary key default gen_random_uuid(),
  room_code     text not null references public.mafia_rooms(room_code) on delete cascade,
  display_name  text not null,
  seat          integer not null,
  is_alive      boolean not null default true,
  -- لاعبون وهميون لوضع التجربة على localhost فقط
  is_bot        boolean not null default false,
  joined_at     timestamptz not null default now(),

  unique (room_code, display_name)
);

create index if not exists mafia_players_room_idx
  on public.mafia_players (room_code);

-- ---------------------------------------------------------------------
-- 3) الأسرار — الدور والمفتاح السري وقدرات كل لاعب (مغلق تماماً)
-- ---------------------------------------------------------------------

create table if not exists public.mafia_secrets (
  player_id           uuid primary key references public.mafia_players(id) on delete cascade,
  room_code           text not null references public.mafia_rooms(room_code) on delete cascade,
  token               text not null unique,
  role                text,
  original_role       text,
  -- الجندي: درع مرة وحدة طول اللعبة
  soldier_shield_used boolean not null default false,
  -- الساحر والصحفي: قدرة مرة وحدة طول اللعبة
  ability_used        boolean not null default false,
  -- الانتحاري: آخر لاعب اختاره
  suicide_target      uuid,
  -- الدكتور: ما يقدر يحمي نفس الشخص ليلتين ورا بعض
  last_protected      uuid,
  -- رسائل خاصة لهذا اللاعب فقط (مثل: "فلان صار معكم")
  notes               jsonb not null default '[]'::jsonb
);

create index if not exists mafia_secrets_room_idx
  on public.mafia_secrets (room_code);

-- ---------------------------------------------------------------------
-- 4) أفعال الليل والتصويت (مغلقة تماماً)
-- ---------------------------------------------------------------------

create table if not exists public.mafia_actions (
  id            uuid primary key default gen_random_uuid(),
  room_code     text not null references public.mafia_rooms(room_code) on delete cascade,
  night         integer not null,
  step          text not null,
  actor_id      uuid not null references public.mafia_players(id) on delete cascade,
  target_id     uuid references public.mafia_players(id) on delete cascade,
  -- المافيا: أسماء اللي صادقوا على اختيار القائد
  confirmed_by  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),

  unique (room_code, night, step, actor_id)
);

create index if not exists mafia_actions_room_night_idx
  on public.mafia_actions (room_code, night);

create table if not exists public.mafia_votes (
  room_code   text not null references public.mafia_rooms(room_code) on delete cascade,
  round       integer not null,
  voter_id    uuid not null references public.mafia_players(id) on delete cascade,
  -- null = تخطي
  target_id   uuid references public.mafia_players(id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (room_code, round, voter_id)
);

-- ---------------------------------------------------------------------
-- 5) صلاحيات الصفوف (RLS)
--    القراءة فقط للجداول العامة. كل الكتابة تمر عبر Server Actions
--    بصلاحية service role (التي تتجاوز RLS بشكل كامل).
-- ---------------------------------------------------------------------

alter table public.mafia_rooms   enable row level security;
alter table public.mafia_players enable row level security;
alter table public.mafia_secrets enable row level security;
alter table public.mafia_actions enable row level security;
alter table public.mafia_votes   enable row level security;

drop policy if exists mafia_rooms_read on public.mafia_rooms;
create policy mafia_rooms_read
  on public.mafia_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists mafia_players_read on public.mafia_players;
create policy mafia_players_read
  on public.mafia_players for select
  to anon, authenticated
  using (true);

-- mafia_secrets / mafia_actions / mafia_votes: RLS مفعّل بدون أي سياسة => مقصود.

-- ---------------------------------------------------------------------
-- 6) البث اللحظي (Realtime)
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mafia_rooms'
  ) then
    alter publication supabase_realtime add table public.mafia_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mafia_players'
  ) then
    alter publication supabase_realtime add table public.mafia_players;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7) تحديث updated_at تلقائياً
-- ---------------------------------------------------------------------

create or replace function public.mafia_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mafia_rooms_set_updated_at on public.mafia_rooms;
create trigger mafia_rooms_set_updated_at
  before update on public.mafia_rooms
  for each row execute function public.mafia_set_updated_at();
