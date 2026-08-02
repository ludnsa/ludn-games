-- =====================================================================
-- 0002_quiz_session_options.sql
-- إعدادات جلسة قابلة للتخصيص: مدة السؤال لكل جلسة.
-- عدد الفئات (2-6) لا يحتاج عموداً — يُشتق من عدد أعمدة اللقطة المحفوظة
-- في quiz_session_questions.
--
-- طريقة التشغيل: انسخ هذا الملف والصقه في Supabase SQL Editor بعد
-- تشغيل 0001_quiz_grid.sql. قابل لإعادة التشغيل (idempotent).
-- =====================================================================

alter table public.quiz_rooms
  add column if not exists timer_seconds integer not null default 60;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'quiz_rooms_timer_seconds_check'
  ) then
    alter table public.quiz_rooms
      add constraint quiz_rooms_timer_seconds_check
      check (timer_seconds between 15 and 300);
  end if;
end $$;
