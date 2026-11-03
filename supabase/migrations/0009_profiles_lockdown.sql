-- =====================================================================
-- 0009_profiles_lockdown.sql
-- جدول profiles: المتصفح يعدّل الاسم والجوال بس
--
-- قبل: أي مستخدم مسجّل يقدر يعدّل صفه كامل من المتصفح — يزيد رصيده
-- (available_tokens) ويغيّر role و account_status — لأن سياسة "Users can update
-- own profile" ما تحدد أعمدة، والصلاحيات على كل الأعمدة.
-- الموقع من المتصفح يعدّل الاسم والجوال بس (صفحة حسابي)، والباقي من السيرفر
-- (service role) اللي ما تأثر عليه هالقيود.
--
-- وسياسة "Public profiles are viewable by everyone except admin" ما يستخدمها الموقع
-- (كل صفحة تقرأ صف صاحبها بس)، وهي اللي تطلع خطأ
-- "permission denied for table users" لأنها تقرأ auth.users — نشيلها.
--
-- طريقة التشغيل: انسخه والصقه في Supabase SQL Editor ثم شغّله. قابل لإعادة التشغيل.
-- =====================================================================

revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, phone_number) on public.profiles to authenticated;

drop policy if exists "Public profiles are viewable by everyone except admin" on public.profiles;
