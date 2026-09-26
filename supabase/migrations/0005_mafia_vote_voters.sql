-- =====================================================================
-- 0005_mafia_vote_voters.sql
-- التصويت المكشوف: مين صوّت على مين، يشوفه الكل عشان يحللون.
--
-- طريقة التشغيل: انسخ الملف والصقه في Supabase SQL Editor ثم شغّله.
-- قابل لإعادة التشغيل بدون أخطاء.
-- =====================================================================

-- { "<target_player_id>" | "skip": ["<voter_player_id>", ...] }
alter table public.mafia_rooms
  add column if not exists vote_voters jsonb not null default '{}'::jsonb;
