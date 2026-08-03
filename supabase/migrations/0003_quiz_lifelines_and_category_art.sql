-- =====================================================================
-- 0003_quiz_lifelines_and_category_art.sql
-- وسائل مساعدة قابلة للاختيار (3 من أصل 6 لكل فريق) + صور الفئات.
--
-- طريقة التشغيل: شغّل هذا الملف بعد 0001 و 0002 في Supabase SQL Editor.
-- قابل لإعادة التشغيل (idempotent).
--
-- لماذا نستبدل الأعمدة الستة القديمة (t1_call_used ... t2_rest_used) بمصفوفات:
-- الحقول المنفصلة تفترض أن كل فريق يملك نفس الوسائل الثلاث دائماً. الآن يختار
-- الحكم 3 وسائل من أصل 6 لكل فريق بشكل مستقل، فالبنية الصحيحة "قائمة الوسائل
-- المملوكة" + "قائمة الوسائل المستخدمة" لكل فريق.
-- =====================================================================

alter table public.quiz_rooms
  add column if not exists t1_lifelines       text[] not null default '{call,pit,rest}',
  add column if not exists t2_lifelines       text[] not null default '{call,pit,rest}',
  add column if not exists t1_lifelines_used  text[] not null default '{}',
  add column if not exists t2_lifelines_used  text[] not null default '{}',
  -- "مضاعفة" — رهان أعمى قبل عرض السؤال، يضاعف نقاط السؤال عند الإجابة الصحيحة
  add column if not exists double_active_team smallint,
  -- "دور إضافي" — رهان أعمى قبل عرض السؤال، يمنع انتقال الدور عند الإجابة الصحيحة
  add column if not exists extra_turn_team    smallint,
  -- "استشارة الجمهور" — إعلان فقط أثناء عرض السؤال، بلا أي تأثير على النقاط
  add column if not exists audience_active    boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_rooms_double_active_team_check'
  ) then
    alter table public.quiz_rooms
      add constraint quiz_rooms_double_active_team_check
      check (double_active_team is null or double_active_team in (1, 2));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'quiz_rooms_extra_turn_team_check'
  ) then
    alter table public.quiz_rooms
      add constraint quiz_rooms_extra_turn_team_check
      check (extra_turn_team is null or extra_turn_team in (1, 2));
  end if;
end $$;

-- الأعمدة الستة القديمة استُبدلت بالمصفوفات أعلاه
alter table public.quiz_rooms
  drop column if exists t1_call_used,
  drop column if exists t1_pit_used,
  drop column if exists t1_rest_used,
  drop column if exists t2_call_used,
  drop column if exists t2_pit_used,
  drop column if exists t2_rest_used;

-- rest_target_player_id (من 0001) يبقى كما هو — تغيّر معناه فقط:
-- كان "اللاعب الممنوع من فريق الخصم"، وأصبح "اللاعب الممنوع من الفريق المُجيب"،
-- لأن استريح الآن يُفعَّلها الفريق المنتظر ضد الفريق صاحب الدور.

-- صور الفئات — نفس نمط صور الأسئلة في quiz_questions (مسار تخزين خاص + وصف عربي)
alter table public.quiz_categories
  add column if not exists image_path text,
  add column if not exists image_alt  text;
