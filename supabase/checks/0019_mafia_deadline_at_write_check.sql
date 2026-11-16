-- ============================================================================
-- فحص بعد 0019_mafia_deadline_at_write.sql. ما يلمس أي غرفة:
-- التجربة على جدول مؤقت (temp) نسخة من mafia_rooms بنفس الـ triggers، وينشال أول ما تخلص التجربة.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (check, name, result, ok). كل الصفوف لازم ok = true. انسخه كامل وأرسله.
--
--   function      الدالة الجديدة موجودة
--   trigger       الـ trigger على mafia_rooms: قبل التحديث، لكل صف، ومفعّل
--   order         يشتغل قبل mafia_rooms_set_updated_at (ترتيب الأسماء) — فيقرا لحظة الحساب قبل ما تنكتب فوقها
--   late_write    كتابة حسبها السيرفر قبل 13 ثانية لتصويت مدته 15: الموعد = الحين + 15 (مو الحين + 2)
--   on_time       كتابة وصلت بوقتها: الحين + 15
--   no_from       كتابة بدون لحظة الحساب (مثل الكود القديم): الموعد مثل ما وصل (الحين + 2)
--   no_deadline   مرحلة بدون مؤقت (موعد فاضي): يظل فاضي
--   other_update  تحديث ما يلمس الموعد (مثل عدّاد الأصوات): الموعد ما يتغير (الحين + 9)
--   updated_at    بعد الكتابة: updated_at = لحظة الكتابة (الـ trigger القديم لسا شغال بعده)
-- ============================================================================

-- النتائج بجدول مؤقت بسيط (ما يعتمد على شي). جدول التجربة نفسه ينشال داخل البلوك قبل ما يخلص،
-- فما يظل شي مربوط بالدالة (والتراجع يمشي حتى لو انشغّل بنفس الجلسة بعد هالفحص)
drop table if exists pg_temp.mafia_deadline_result;
create temp table mafia_deadline_result (room_code text, secs int, written_now boolean);

do $$
begin
  drop table if exists pg_temp.mafia_deadline_try;
  create temp table mafia_deadline_try (like public.mafia_rooms including defaults);
  create trigger mafia_rooms_deadline_at_write before update on mafia_deadline_try
    for each row execute function public.mafia_rooms_deadline_at_write();
  create trigger mafia_rooms_set_updated_at before update on mafia_deadline_try
    for each row execute function public.mafia_set_updated_at();

  insert into mafia_deadline_try (room_code, host_user_id, phase_ends_at) values
    ('LATE', gen_random_uuid(), null),
    ('ONTIME', gen_random_uuid(), null),
    ('NOFROM', gen_random_uuid(), null),
    ('NOEND', gen_random_uuid(), now() + interval '5 seconds'),
    ('OTHER', gen_random_uuid(), now() + interval '9 seconds');

  update mafia_deadline_try
     set phase = 'voting', updated_at = now() - interval '13 seconds',
         phase_ends_at = now() - interval '13 seconds' + interval '15 seconds'
   where room_code = 'LATE';
  update mafia_deadline_try
     set phase = 'voting', updated_at = now(), phase_ends_at = now() + interval '15 seconds'
   where room_code = 'ONTIME';
  update mafia_deadline_try
     set phase = 'voting', phase_ends_at = now() - interval '13 seconds' + interval '15 seconds'
   where room_code = 'NOFROM';
  update mafia_deadline_try
     set phase = 'morning', updated_at = now() - interval '13 seconds', phase_ends_at = null
   where room_code = 'NOEND';
  update mafia_deadline_try
     set vote_counts = '{"skip": 1}'::jsonb
   where room_code = 'OTHER';

  insert into mafia_deadline_result
  select room_code,
         round(extract(epoch from (phase_ends_at - now())))::int,
         abs(extract(epoch from (updated_at - now()))) < 1
    from mafia_deadline_try;
  drop table mafia_deadline_try;
end
$$;

with left_s as (select room_code, secs, written_now from mafia_deadline_result)
select 'function' as "check", 'mafia_rooms_deadline_at_write' as name,
       case when to_regprocedure('public.mafia_rooms_deadline_at_write()') is null then 'MISSING' else 'exists' end as result,
       to_regprocedure('public.mafia_rooms_deadline_at_write()') is not null as ok
union all
select 'trigger', 'mafia_rooms',
       coalesce((select 'before=' || ((tg.tgtype & 2) = 2) || ' row=' || ((tg.tgtype & 1) = 1) || ' update=' || ((tg.tgtype & 16) = 16)
                        || ' enabled=' || (tg.tgenabled = 'O')
                   from pg_trigger tg
                  where tg.tgrelid = 'public.mafia_rooms'::regclass and tg.tgname = 'mafia_rooms_deadline_at_write'),
                'MISSING'),
       exists (select 1 from pg_trigger tg
                where tg.tgrelid = 'public.mafia_rooms'::regclass and tg.tgname = 'mafia_rooms_deadline_at_write'
                  and (tg.tgtype & 19) = 19 and tg.tgenabled = 'O')
union all
select 'order', 'mafia_rooms',
       (select string_agg(tg.tgname, ' -> ' order by tg.tgname)
          from pg_trigger tg where tg.tgrelid = 'public.mafia_rooms'::regclass and not tg.tgisinternal),
       (select array_agg(tg.tgname::text order by tg.tgname)
          from pg_trigger tg where tg.tgrelid = 'public.mafia_rooms'::regclass and not tg.tgisinternal
           and tg.tgname in ('mafia_rooms_deadline_at_write', 'mafia_rooms_set_updated_at'))
         = array['mafia_rooms_deadline_at_write', 'mafia_rooms_set_updated_at']
union all
select 'late_write', 'expect 15', coalesce(secs::text, 'null'), secs = 15 from left_s where room_code = 'LATE'
union all
select 'on_time', 'expect 15', coalesce(secs::text, 'null'), secs = 15 from left_s where room_code = 'ONTIME'
union all
select 'no_from', 'expect 2', coalesce(secs::text, 'null'), secs = 2 from left_s where room_code = 'NOFROM'
union all
select 'no_deadline', 'expect null', coalesce(secs::text, 'null'), secs is null from left_s where room_code = 'NOEND'
union all
select 'other_update', 'expect 9', coalesce(secs::text, 'null'), secs = 9 from left_s where room_code = 'OTHER'
union all
select 'updated_at', 'late write', case when written_now then 'now' else 'NOT now' end, written_now from left_s where room_code = 'LATE'
order by 1;
