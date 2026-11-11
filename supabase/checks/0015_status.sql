-- ============================================================================
-- الوضع قبل 0015_game_sessions.sql. قراءة بس، ما يغيّر شي.
--
-- طريقة التشغيل: انسخ الملف كامل في Supabase SQL Editor واضغط Run.
-- النتيجة جدول واحد (section, name, detail). انسخه كامل وأرسله.
--
-- الأقسام:
--   1 free        اسم الجدول والدوال الجديدة فاضية (المتوقع: free للكل)
--   2 needs       الجداول والأعمدة اللي تعتمد عليها الدوال موجودة بالنوع الصح
--   3 server      مفتاح الخدمة يقدر يقرا ويعدّل اللي تحتاجه الدوال
--   4 triggers    أي trigger على user_games أو profiles (للعلم: الدوال تعدّل فيهم)
--   5 dupes       صفوف مكررة لنفس الحساب واللعبة في user_games (المتوقع: 0)
--   6 default     الصلاحيات اللي ياخذها أي جدول أو دالة جديدة تلقائياً (0015 يسحبها)
--   7 version     نسخة Postgres، و gen_random_uuid موجودة
--   8 mafia now   غرف مافيا شغالة الحين (للعلم: انحسبت بالطريقة القديمة، وما تتأثر)
-- ============================================================================

select '1 free' as section,
       x.name,
       case when x.found then 'TAKEN' else 'free' end as detail
  from (values
          ('public.game_sessions', to_regclass('public.game_sessions') is not null),
          ('public.game_session_* functions',
           exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname like 'game\_session\_%'))
       ) as x(name, found)

union all
select '2 needs',
       x.name,
       coalesce(x.detail, 'MISSING')
  from (values
          ('auth.users', case when to_regclass('auth.users') is not null then 'exists' end),
          ('user_games.user_id', (select data_type from information_schema.columns
                                   where table_schema = 'public' and table_name = 'user_games' and column_name = 'user_id')),
          ('user_games.game_id', (select data_type from information_schema.columns
                                   where table_schema = 'public' and table_name = 'user_games' and column_name = 'game_id')),
          ('user_games.games_played', (select data_type from information_schema.columns
                                        where table_schema = 'public' and table_name = 'user_games' and column_name = 'games_played')),
          ('user_games.is_purchased', (select data_type from information_schema.columns
                                        where table_schema = 'public' and table_name = 'user_games' and column_name = 'is_purchased')),
          ('user_games.id default', (select coalesce(column_default, 'NO DEFAULT') from information_schema.columns
                                      where table_schema = 'public' and table_name = 'user_games' and column_name = 'id')),
          ('profiles.available_tokens', (select data_type from information_schema.columns
                                          where table_schema = 'public' and table_name = 'profiles' and column_name = 'available_tokens')),
          ('user_subscriptions.ends_at', (select data_type from information_schema.columns
                                           where table_schema = 'public' and table_name = 'user_subscriptions' and column_name = 'ends_at'))
       ) as x(name, detail)

union all
select '3 server',
       x.name,
       case when x.ok then 'ok' else 'NO' end
  from (values
          ('service_role select/insert/update user_games',
           has_table_privilege('service_role', 'public.user_games', 'SELECT')
           and has_table_privilege('service_role', 'public.user_games', 'INSERT')
           and has_table_privilege('service_role', 'public.user_games', 'UPDATE')),
          ('service_role select/update profiles',
           has_table_privilege('service_role', 'public.profiles', 'SELECT')
           and has_table_privilege('service_role', 'public.profiles', 'UPDATE')),
          ('service_role select user_subscriptions',
           has_table_privilege('service_role', 'public.user_subscriptions', 'SELECT')),
          ('service_role bypasses RLS',
           (select rolbypassrls from pg_roles where rolname = 'service_role'))
       ) as x(name, ok)

union all
select '4 triggers',
       c.relname || ' / ' || t.tgname,
       pg_get_triggerdef(t.oid)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('user_games', 'profiles')
   and not t.tgisinternal

union all
select '5 dupes',
       'user_games rows sharing user_id + game_id',
       (select count(*) from (select user_id, game_id from public.user_games
                               group by user_id, game_id having count(*) > 1) d)::text

union all
select '6 default',
       pg_get_userbyid(d.defaclrole) || ' -> new '
         || case d.defaclobjtype when 'r' then 'tables' when 'f' then 'functions' else d.defaclobjtype::text end
         || ' in ' || coalesce(n.nspname, '(all)'),
       array_to_string(d.defaclacl, ' ')
  from pg_default_acl d
  left join pg_namespace n on n.oid = d.defaclnamespace
 where d.defaclobjtype in ('r', 'f')
   and (n.nspname = 'public' or n.nspname is null)

union all
select '7 version',
       'server_version',
       current_setting('server_version')

union all
select '7 version',
       'gen_random_uuid()',
       case when to_regprocedure('gen_random_uuid()') is not null then 'exists' else 'MISSING' end

union all
select '8 mafia now',
       'rooms in play (not lobby/ended/closed)',
       (select count(*) from public.mafia_rooms
         where phase not in ('lobby', 'ended', 'closed'))::text

order by 1, 2;
