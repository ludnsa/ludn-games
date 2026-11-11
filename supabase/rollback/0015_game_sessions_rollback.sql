-- =====================================================================
-- التراجع عن 0015_game_sessions.sql
-- يشيل جلسات اللعب كاملة: الجدول والدوال الإحدى عشر. ما يلمس ولا جدول ثاني.
--
-- ⚠️ قبل التشغيل: لازم كود المافيا يرجع للطريقة القديمة (أو ما يكون انرفع أصلاً).
--    الكود الجديد يحجز من هالجدول، وبدونه المافيا ما تبدأ.
--
-- اللي يضيع معه: سجل الجلسات بس. عدّاد اللعب (user_games) والرصيد (profiles)
--   ما يتغيرون: اللي انحسب يظل محسوب، واللي رجع يظل راجع.
--   الجلسات المحجوزة وقت التراجع (لعبة شغالة قبل أول صباح) ما تنحسب.
--   الرصيد: لو فيه لعبة شغالة من الرصيد وقت التراجع، اللعبة اللي انخصمت ما ترجع.
--   النتيجة تحت تطلع لك أي وحدة منها (الحساب واللعبة)، وتقدر ترجّعها من لوحة التحكم.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   قابل لإعادة التشغيل. آخر استعلام يطلع لك صفين "removed"، وتحتهم أي لعبة رصيد لازم ترجع.
-- =====================================================================

-- 1) للعلم قبل الحذف: جلسات شغالة من الرصيد القديم
drop table if exists pg_temp.rb0015_tokens;
create temp table rb0015_tokens (user_id uuid, game_id text, room_ref text);
do $$
begin
  if to_regclass('public.game_sessions') is not null then
    execute 'insert into rb0015_tokens select user_id, game_id, room_ref from public.game_sessions
              where status = ''reserved'' and kind = ''token''';
  end if;
end $$;

begin;

drop function if exists public.game_session_cancel(uuid);
drop function if exists public.game_session_access(uuid, text);
drop function if exists public.game_session_ping(uuid, text, text);
drop function if exists public.game_session_end(text, text);
drop function if exists public.game_session_count(text, text);
drop function if exists public.game_session_begin(uuid, text, text);
drop function if exists public.game_session_settle(uuid, text, boolean);
drop function if exists public.game_session_close(uuid, text, text);
drop function if exists public.game_session_bump(uuid, text, integer);
drop function if exists public.game_session_lock(uuid, text);
drop function if exists public.game_session_rules();

-- الفهارس تنحذف مع الجدول
drop table if exists public.game_sessions;

commit;

notify pgrst, 'reload schema';

-- التأكد: الاثنين "removed"، وتحتهم (لو فيه) ألعاب الرصيد اللي لازم ترجع
select 'game_sessions' as item,
       case when to_regclass('public.game_sessions') is null then 'removed' else 'STILL THERE' end as status
union all
select 'game_session_* functions',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'game\_session\_%')
            then 'removed' else 'STILL THERE' end
union all
select 'refund 1 token: user ' || user_id::text || ' (' || game_id || ')',
       'room ' || room_ref
  from rb0015_tokens;
