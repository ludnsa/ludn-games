-- =====================================================================
-- 0001_quiz_grid.sql
-- لعبة "تحدي الفئات" (quiz-grid) — الجداول والصلاحيات ومساحة تخزين الصور
--
-- طريقة التشغيل: انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor ثم شغّله.
-- الملف قابل لإعادة التشغيل (idempotent) — تشغيله أكثر من مرة لا يسبب أخطاء.
--
-- ملاحظة أمنية مهمة:
--   جدول quiz_session_questions لا يملك أي سياسة (policy) للعميل إطلاقاً.
--   هذا مقصود: الإجابات لا يجب أن تصل لجهاز اللاعب أبداً. شاشة الحكم تقرأ
--   محتوى الخلايا عبر Server Action تستخدم service role فقط.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) بنك المحتوى: الفئات والأسئلة
-- ---------------------------------------------------------------------

create table if not exists public.quiz_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_ar     text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references public.quiz_categories(id) on delete cascade,
  external_ref       text,
  question_text      text not null,
  answer_text        text not null,
  points             integer not null check (points in (200, 400, 600)),
  question_image     text,
  question_image_alt text,
  answer_image       text,
  answer_image_alt   text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- فهرس السحب: نختار حسب الفئة والفئة السعرية عند بداية كل جلسة
create index if not exists quiz_questions_category_points_idx
  on public.quiz_questions (category_id, points);

-- يضمن أن إعادة الاستيراد لا تكرر الأسئلة (upsert على external_ref)
create unique index if not exists quiz_questions_external_ref_key
  on public.quiz_questions (external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------
-- 2) الجلسات: الغرفة، لوحة الـ 36 خلية، واللاعبون
-- ---------------------------------------------------------------------

create table if not exists public.quiz_rooms (
  room_code            text primary key,
  host_user_id         uuid,

  -- setup | board | question | answer | gameOver
  game_state           text not null default 'setup',

  t1_name              text not null default 'الفريق الأول',
  t2_name              text not null default 'الفريق الثاني',
  t1_score             integer not null default 0,
  t2_score             integer not null default 0,
  turn                 smallint not null default 1 check (turn in (1, 2)),

  -- وسائل المساعدة: كل فريق يملك ثلاثاً، كل واحدة تُستخدم مرة واحدة في المباراة
  t1_call_used         boolean not null default false,
  t1_pit_used          boolean not null default false,
  t1_rest_used         boolean not null default false,
  t2_call_used         boolean not null default false,
  t2_pit_used          boolean not null default false,
  t2_rest_used         boolean not null default false,

  -- حالة السؤال الحالي. لا يوجد هنا أي نص سؤال أو إجابة — بشكل مقصود،
  -- لأن هذا الصف يُبث عبر Realtime لأجهزة اللاعبين.
  active_cell_id       uuid,
  is_question_revealed boolean not null default false,
  call_friend_active   boolean not null default false,
  pit_active_team      smallint check (pit_active_team in (1, 2)),
  rest_target_player_id uuid,

  -- مؤقت مبني على وقت الانتهاء بدل الكتابة كل ثانية
  question_deadline_at timestamptz,
  is_timer_running     boolean not null default false,

  -- ملخص الجلسة
  winner_team          smallint check (winner_team in (0, 1, 2)), -- 0 = تعادل
  ended_at             timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists quiz_rooms_host_user_idx
  on public.quiz_rooms (host_user_id);

-- لقطة ثابتة من 36 سؤالاً تُسحب مرة واحدة عند بداية الجلسة.
-- النصوص منسوخة هنا حتى تبقى اللوحة ثابتة وقابلة للاستئناف
-- حتى لو عُدّل بنك الأسئلة أثناء اللعب.
create table if not exists public.quiz_session_questions (
  id                 uuid primary key default gen_random_uuid(),
  room_code          text not null references public.quiz_rooms(room_code) on delete cascade,
  question_id        uuid references public.quiz_questions(id) on delete set null,

  column_index       smallint not null check (column_index between 0 and 5),
  row_index          smallint not null check (row_index between 0 and 5),

  category_id        uuid,
  category_name_ar   text not null,
  points             integer not null check (points in (200, 400, 600)),

  question_text      text not null,
  answer_text        text not null,
  question_image     text,
  question_image_alt text,
  answer_image       text,
  answer_image_alt   text,

  -- available | consumed
  status             text not null default 'available',
  awarded_team       smallint check (awarded_team in (1, 2)),

  created_at         timestamptz not null default now(),

  unique (room_code, column_index, row_index)
);

create index if not exists quiz_session_questions_room_idx
  on public.quiz_session_questions (room_code);

create table if not exists public.quiz_session_players (
  id           uuid primary key default gen_random_uuid(),
  room_code    text not null references public.quiz_rooms(room_code) on delete cascade,
  device_id    text not null,
  display_name text not null,
  team         smallint not null check (team in (1, 2)),
  joined_at    timestamptz not null default now(),

  unique (room_code, device_id)
);

create index if not exists quiz_session_players_room_idx
  on public.quiz_session_players (room_code);

-- ---------------------------------------------------------------------
-- 3) صلاحيات الصفوف (RLS)
--    القراءة فقط للعميل. كل الكتابة تمر عبر Server Actions بصلاحية
--    service role (التي تتجاوز RLS بشكل كامل).
-- ---------------------------------------------------------------------

alter table public.quiz_categories        enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.quiz_rooms             enable row level security;
alter table public.quiz_session_questions enable row level security;
alter table public.quiz_session_players   enable row level security;

drop policy if exists quiz_categories_read on public.quiz_categories;
create policy quiz_categories_read
  on public.quiz_categories for select
  to anon, authenticated
  using (is_active);

drop policy if exists quiz_questions_read on public.quiz_questions;
create policy quiz_questions_read
  on public.quiz_questions for select
  to anon, authenticated
  using (is_active);

drop policy if exists quiz_rooms_read on public.quiz_rooms;
create policy quiz_rooms_read
  on public.quiz_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists quiz_session_players_read on public.quiz_session_players;
create policy quiz_session_players_read
  on public.quiz_session_players for select
  to anon, authenticated
  using (true);

-- quiz_session_questions: RLS مفعّل بدون أي سياسة =>
-- لا anon ولا authenticated يستطيع قراءة أو كتابة أي صف. مقصود.
drop policy if exists quiz_session_questions_read on public.quiz_session_questions;

-- ---------------------------------------------------------------------
-- 4) البث اللحظي (Realtime)
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quiz_rooms'
  ) then
    alter publication supabase_realtime add table public.quiz_rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quiz_session_players'
  ) then
    alter publication supabase_realtime add table public.quiz_session_players;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5) مساحة تخزين الصور: bucket خاص، يُقرأ عبر روابط موقّعة فقط
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('quiz-media', 'quiz-media', false)
on conflict (id) do update set public = false;

-- لا نضيف أي سياسة على storage.objects لهذا الـ bucket — بشكل مقصود.
-- النتيجة: anon و authenticated لا يستطيعان الرفع أو القراءة المباشرة.
-- الرفع يتم من Server Actions بصلاحية service role، والعرض عبر
-- روابط موقّعة (signed URLs) تُنشأ من السيرفر وتنتهي صلاحيتها تلقائياً.

-- ---------------------------------------------------------------------
-- 6) تحديث updated_at تلقائياً
-- ---------------------------------------------------------------------

create or replace function public.quiz_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quiz_questions_set_updated_at on public.quiz_questions;
create trigger quiz_questions_set_updated_at
  before update on public.quiz_questions
  for each row execute function public.quiz_set_updated_at();

drop trigger if exists quiz_rooms_set_updated_at on public.quiz_rooms;
create trigger quiz_rooms_set_updated_at
  before update on public.quiz_rooms
  for each row execute function public.quiz_set_updated_at();
