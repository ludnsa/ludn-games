-- ============================================================================
-- حرب القلاع: التصفير المجاني مرة وحدة لكل غرفة
--
-- free_reset:
--   none   لسا ما انستخدم
--   credit انستخدم التصفير المجاني، والبدء الجاي في هالغرفة ما ينحسب
--   used   البدء المجاني راح، وأي تصفير بعده ينحسب
--
-- ليش trigger مو RLS بس؟
-- RLS يقيّد الصفوف مو الأعمدة، وجوالات الفرق (بدون حساب) لازم تحدّث نفس صف الغرفة
-- (التوزيع و live_sync). فالـ trigger هو اللي يخلي free_reset لصاحب الغرفة بس،
-- بدون ما نلمس سياسات RLS الحالية أو صلاحيات الجوالات.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- آخر سطر يطلع لك صف واحد للتأكد. قسم التراجع تحت معطّل، وما يشتغل مع الملف.
-- ============================================================================

begin;

-- 1) نسخة احتياطية (RLS مفعّل بدون سياسات: ما يقدر يقراها إلا لوحة SQL ومفتاح الخدمة)
create table if not exists public.cw_rooms_backup_20261104 as table public.cw_rooms;
alter table public.cw_rooms_backup_20261104 enable row level security;

-- 2) العمود: كل الغرف الموجودة تصير none
alter table public.cw_rooms
  add column if not exists free_reset text not null default 'none'
  check (free_reset in ('none', 'credit', 'used'));

-- 3) الحماية
create or replace function public.cw_rooms_guard_free_reset()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- القيد على طلبات المتصفح بس. لوحة SQL ومفتاح الخدمة ما عليهم قيد
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- ما أحد ينشئ غرفة وفيها مجاني جاهز
  if tg_op = 'INSERT' then
    new.free_reset := 'none';
    return new;
  end if;

  -- صاحب الغرفة ما يتغير، وإلا أي واحد يقدر يسجّل الغرفة باسمه ويتخطى القيد تحت
  if new.created_by is distinct from old.created_by then
    raise exception 'cw_rooms: created_by cannot change' using errcode = '42501';
  end if;

  if new.free_reset is distinct from old.free_reset then
    -- صاحب الغرفة بس
    if auth.uid() is null or auth.uid() is distinct from old.created_by then
      raise exception 'cw_rooms: only the room owner can change free_reset' using errcode = '42501';
    end if;
    -- وللأمام بس: none ثم credit ثم used. ما فيه رجوع، فالمجاني ما يتكرر
    if not (
      (old.free_reset = 'none' and new.free_reset = 'credit')
      or (old.free_reset = 'credit' and new.free_reset = 'used')
    ) then
      raise exception 'cw_rooms: free_reset can only move forward' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists cw_rooms_guard_free_reset on public.cw_rooms;
create trigger cw_rooms_guard_free_reset
  before insert or update on public.cw_rooms
  for each row execute function public.cw_rooms_guard_free_reset();

commit;

-- 4) تأكيد: rooms و backup_rows و rooms_none لازم يكونون نفس الرقم، و trigger_ok = 1
select
  (select count(*) from public.cw_rooms) as rooms,
  (select count(*) from public.cw_rooms_backup_20261104) as backup_rows,
  (select count(*) from public.cw_rooms where free_reset = 'none') as rooms_none,
  (select count(*) from pg_trigger where tgname = 'cw_rooms_guard_free_reset' and not tgisinternal) as trigger_ok,
  (select relrowsecurity from pg_class where oid = 'public.cw_rooms'::regclass) as rls_on,
  (select jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check))
     from pg_policies where schemaname = 'public' and tablename = 'cw_rooms') as policies;


-- ============================================================================
-- التراجع: حدّد الأسطر الثلاثة وشغّلها لحالها. الكود يرجع للوضع القديم بدون عطل.
-- ============================================================================
/*
drop trigger if exists cw_rooms_guard_free_reset on public.cw_rooms;
drop function if exists public.cw_rooms_guard_free_reset();
alter table public.cw_rooms drop column if exists free_reset;
*/

-- حذف النسخة الاحتياطية، بعد ما تتطمن:
/*
drop table if exists public.cw_rooms_backup_20261104;
*/
