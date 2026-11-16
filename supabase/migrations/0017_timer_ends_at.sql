-- =====================================================================
-- 0017_timer_ends_at.sql
-- المزاد والسيطرة على العالم: المؤقت ينكتب مرة وحدة كوقت انتهاء، بدل الكتابة كل ثانية.
--
-- قبل: الحكم/المنشئ يكتب الغرفة كاملة كل ثانية والمؤقت شغال، وكل كتابة توصل كل الجوالات والشاشات
--      (المزاد ~5 رسائل بالثانية للغرفة، والسيطرة رسالتين بالثانية لكل شاشة جمهور).
-- بعد: وقت الانتهاء ينكتب مرة وحدة مع البداية (ومرة مع الوقفة)، وكل جهاز يعد منه.
--      ولو أحد حدّث الصفحة وسط المؤقت، يقرا وقت الانتهاء ويرجع على الوقت الصح.
--
-- التغيير: عمود واحد جديد فاضي في كل جدول:
--   auction_rooms.timer_ends_at  timestamptz  (null = المؤقت واقف)
--   wd_rooms.timer_ends_at       timestamptz  (null = المؤقت واقف)
-- بدون قيمة افتراضية وبدون قيود: الإضافة لحظية وما تعيد كتابة الجدول.
-- ما ينحذف شي، وما تتغير الصلاحيات ولا قواعد RLS ولا البث اللحظي:
--   الجدولين في البث (supabase_realtime) كاملين، فالعمود الجديد يوصل مع التحديثات لحاله،
--   وصلاحيات الجدول (anon و authenticated) تشمل العمود الجديد لحالها — الفحص قبل يتأكد من هذا.
-- الكود القديم ما يعرف العمود ويتجاهله. والكود الجديد لو انرفع قبل هذا الملف، يكتب بدون العمود
-- (المؤقت يمشي، بس جوالات الفرق وشاشة الجمهور تعرض الرقم بدون عد لين ينشغّل الملف).
--
-- الأمان:
--   - lock_timeout 5 ثواني: لو الجدول مشغول بطلب طويل، الملف يوقف بخطأ بدل ما يعلّق الألعاب،
--     وما يتغير شي (كله بخطوة وحدة). تقدر تعيد تشغيله.
--   - قابل لإعادة التشغيل (add column if not exists).
--
-- قبل التشغيل: supabase/checks/0017_status.sql وأرسل نتيجته.
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
--   آخر استعلام يطلع لك صف لكل جدول للتأكد.
-- بعد التشغيل: supabase/checks/0017_timer_ends_at_check.sql
-- التراجع: supabase/rollback/0017_timer_ends_at_rollback.sql
-- =====================================================================

begin;

set local lock_timeout = '5s';

alter table public.auction_rooms
  add column if not exists timer_ends_at timestamptz;
comment on column public.auction_rooms.timer_ends_at is
  'وقت انتهاء مؤقت السؤال والمؤقت شغال (null = واقف). ينكتب مرة وحدة مع البداية، والجوالات تعد منه';

alter table public.wd_rooms
  add column if not exists timer_ends_at timestamptz;
comment on column public.wd_rooms.timer_ends_at is
  'وقت انتهاء مؤقت السؤال والمؤقت شغال (null = واقف). ينكتب مرة وحدة مع البداية، وشاشة الجمهور تعد منه';

commit;

-- تأكيد: صف لكل جدول. المتوقع: column = timestamp with time zone، nullable = YES، default = none
select c.table_name,
       c.data_type as column,
       c.is_nullable as nullable,
       coalesce(c.column_default, 'none') as "default"
  from information_schema.columns c
 where c.table_schema = 'public'
   and c.table_name in ('auction_rooms', 'wd_rooms')
   and c.column_name = 'timer_ends_at'
 order by c.table_name;
