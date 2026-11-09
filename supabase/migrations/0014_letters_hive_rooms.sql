-- =====================================================================
-- 0014_letters_hive_rooms.sql
-- غرفة أونلاين لخلية الحروف: شاشة العرض تنفتح من أي جوال أو جهاز بالكود أو الباركود
-- وتتحدث لحظياً، والجلسة محفوظة بالسيرفر ومربوطة بحساب المقدم.
--
-- جدولين جديدين، وما يلمس ولا جدول موجود:
--   hive_rooms       حالة اللوحة اللي تعرضها الشاشة (الحروف، الألوان، الحرف المختار، النتيجة).
--                    القراءة لأي أحد (شاشة العرض تنفتح بدون تسجيل)، بس للغرف اللي تحدثت
--                    آخر 24 ساعة. ما فيه أي معلومة عن الحساب. الكتابة ممنوعة على المتصفح.
--   hive_room_hosts  صاحب كل غرفة (حساب المقدم). مقفول تماماً: ولا قراءة ولا كتابة من المتصفح.
--                    كل حساب له غرفة وحدة بالكثير.
--   الكتابة كلها من السيرفر بمفتاح الخدمة (actions/letters-hive.ts)، بعد ما يتأكد إن
--   اللي يكتب هو صاحب الغرفة.
--
-- البث اللحظي: hive_rooms تنضاف لـ supabase_realtime، فشاشة العرض تسمع لكل تعديل.
--   البث يمشي على نفس قاعدة القراءة (RLS)، فما يوصل إلا اللي تقدر الشاشة تقراه.
--
-- قبل التشغيل: شغّل supabase/checks/0014_status.sql وأرسل لي النتيجة.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك صفين للتأكد.
-- بعد التشغيل: شغّل supabase/checks/0014_letters_hive_rooms_check.sql
--   (يجرب بأدوار حقيقية ويلغي كل تجاربه).
-- التراجع: supabase/rollback/0014_letters_hive_rooms_rollback.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) الغرفة: حالة اللوحة اللي تعرضها الشاشة
-- ---------------------------------------------------------------------
create table if not exists public.hive_rooms (
  -- H + 4 من حروف وأرقام ما تتلخبط (بدون I و O و 0 و 1)، مثل HK7QM
  room_code   text primary key,
  -- نفس حالة اللعبة اللي كانت تنحفظ بذاكرة المتصفح (HiveState في lib/game/letters-hive-engine.ts)
  state       jsonb not null,
  -- يزيد مع كل حفظ: الشاشة تتجاهل أي نسخة أقدم من اللي عندها
  rev         bigint not null default 0,
  -- playing = الجلسة شغالة، ended = المقدم أنهاها
  status      text not null default 'playing',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint hive_rooms_code_chk   check (room_code ~ '^H[A-HJ-NP-Z2-9]{4}$'),
  constraint hive_rooms_status_chk check (status in ('playing', 'ended')),
  -- حماية من حفظ شي غريب أو كبير (الحالة الطبيعية أقل من 10 كيلو)
  constraint hive_rooms_state_chk  check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 65536)
);

-- ---------------------------------------------------------------------
-- 2) صاحب الغرفة: مقفول تماماً (السيرفر بس)
-- ---------------------------------------------------------------------
create table if not exists public.hive_room_hosts (
  room_code     text primary key references public.hive_rooms(room_code) on delete cascade,
  -- unique: غرفة وحدة لكل حساب. لو انحذف الحساب تنحذف غرفته
  host_user_id  uuid not null unique references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) updated_at يتحدث تلقائياً مع كل حفظ (منه نعرف الغرف القديمة)
-- ---------------------------------------------------------------------
create or replace function public.hive_rooms_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.hive_rooms_set_updated_at() from public, anon, authenticated;

drop trigger if exists hive_rooms_set_updated_at on public.hive_rooms;
create trigger hive_rooms_set_updated_at
  before update on public.hive_rooms
  for each row execute function public.hive_rooms_set_updated_at();

-- ---------------------------------------------------------------------
-- 4) الحماية: مفعّلة من أول يوم
-- ---------------------------------------------------------------------
alter table public.hive_rooms      enable row level security;
alter table public.hive_room_hosts enable row level security;

-- Supabase يعطي الجداول الجديدة كل الصلاحيات للمتصفح تلقائياً: نسحبها كلها،
-- ونرجّع القراءة بس لجدول الغرفة. جدول أصحاب الغرف ما يبقى له ولا صلاحية.
revoke all on table public.hive_rooms      from anon, authenticated, public;
revoke all on table public.hive_room_hosts from anon, authenticated, public;
grant select on table public.hive_rooms to anon, authenticated;

-- مفتاح الخدمة (السيرفر): يتخطى RLS، ونتأكد إن صلاحياته موجودة
grant select, insert, update, delete on table public.hive_rooms      to service_role;
grant select, insert, update, delete on table public.hive_room_hosts to service_role;

-- قاعدة القراءة الوحيدة: أي أحد يقرا الغرف اللي تحدثت آخر 24 ساعة (شاشة العرض بالكود)
drop policy if exists hive_rooms_read_recent on public.hive_rooms;
create policy hive_rooms_read_recent
  on public.hive_rooms for select
  to anon, authenticated
  using (updated_at > now() - interval '24 hours');

-- hive_room_hosts: RLS مفعّل بدون أي سياسة => مقصود (السيرفر بس).

-- ---------------------------------------------------------------------
-- 5) البث اللحظي
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hive_rooms'
     ) then
    alter publication supabase_realtime add table public.hive_rooms;
  end if;
end $$;

commit;

-- التأكد: rls_enabled = true للجدولين. hive_rooms: anon و authenticated عندهم SELECT بس،
-- وفيه سياسة قراءة وحدة، وهو داخل البث. hive_room_hosts: ولا صلاحية ولا سياسة ولا بث.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'anon') as anon_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'authenticated') as authenticated_privs,
       (select coalesce(string_agg(g.privilege_type, ', ' order by g.privilege_type), '')
          from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'service_role') as service_role_privs,
       (select coalesce(string_agg(p.policyname || ' (' || p.cmd || ')', ', '), '')
          from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       exists (select 1 from pg_publication_tables pt
                where pt.pubname = 'supabase_realtime' and pt.schemaname = 'public' and pt.tablename = c.relname) as realtime
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('hive_rooms', 'hive_room_hosts')
 order by c.relname desc;
