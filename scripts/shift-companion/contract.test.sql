-- Run ONLY in a disposable, empty PostgreSQL database (requires pgcrypto).
-- This fixture tests the real companion migrations and RLS, with the minimal
-- legacy schema they depend on. Full target-schema verification is separate.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
create schema storage;
create schema shift_private;
grant usage on schema auth, extensions, public to anon, authenticated;
grant usage on schema shift_private to authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
create table public.profiles(id uuid primary key, full_name text);
create table public.user_roles(user_id uuid, role text);
create table public.shift_camp_cohorts(id uuid primary key, name text, starts_on date);
create table public.shift_camp_enrollments(cohort_id uuid, user_id uuid, role text, primary key(cohort_id,user_id));
create table public.community_projects(id uuid, shift_cohort_id uuid);
create table public.project_members(project_id uuid,user_id uuid);
create table public.shift_camp_updates(project_id uuid,published_at timestamptz,hidden boolean,body jsonb);
create table storage.objects(bucket_id text,name text);
create function shift_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
$$;
create function shift_private.is_staff(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select shift_private.is_admin() or exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=auth.uid() and role='mentor')
$$;
create function shift_private.can_read(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (shift_private.is_staff(cid) or exists(select 1 from public.shift_camp_enrollments where cohort_id=cid and user_id=auth.uid()))
$$;
create function shift_private.project_cohort(pid uuid) returns uuid language sql stable security definer set search_path='' as $$ select shift_cohort_id from public.community_projects where id=pid $$;
create function shift_private.my_project(cid uuid,uid uuid) returns uuid language sql stable security definer set search_path='' as $$ select p.id from public.community_projects p join public.project_members m on m.project_id=p.id where p.shift_cohort_id=cid and m.user_id=uid limit 1 $$;
\ir ../../supabase/migrations/20261002090000_shift_companion_linking.sql
\ir 20261002100000_shift_companion_contract.sql
create function public.shift_test_assert(condition boolean, message text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAILED: %', message; end if; end $$;
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001','author@example.com',now()),
 ('00000000-0000-0000-0000-000000000002','peer@example.com',now()),
 ('00000000-0000-0000-0000-000000000003','mentor@example.com',now()),
 ('00000000-0000-0000-0000-000000000004','outsider@example.com',now()),
 ('00000000-0000-0000-0000-000000000005','unverified@example.com',null);
insert into public.shift_camp_cohorts(id,name,starts_on) values
 ('10000000-0000-0000-0000-000000000001','Test SHIFT',(now() at time zone 'Asia/Bangkok')::date-2),
 ('10000000-0000-0000-0000-000000000002','Other SHIFT',(now() at time zone 'Asia/Bangkok')::date-2);
insert into public.shift_camp_enrollments values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','participant',true),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','mentor',false),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','mentor',false);
insert into shift_private.roster(id,cohort_id,user_id,email,mobile) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',null,'author@example.com',null),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','peer@example.com','+66812345678');
insert into shift_private.link_codes(roster_id,code_hash,expires_at,issued_by) values
 ('20000000-0000-0000-0000-000000000001',encode(extensions.digest('ABCDEFGHJKLM','sha256'),'hex'),now()+interval '1 day','00000000-0000-0000-0000-000000000003');
set role anon;
select shift_test_assert(public.shift_companion_action('preview_code','{"code":"BBBB-BBBB-BBBB"}')->>'error'='unavailable','code hash is matched exactly');
select shift_test_assert(public.shift_companion_action('preview_code','{"code":"ABCD-EFGH-JKLM"}')->>'cohort_name'='Test SHIFT','anonymous preview works without private schema access');
select shift_test_assert(not (public.shift_companion_action('preview_code','{"code":"ABCD-EFGH-JKLM"}') ? 'email'),'preview never exposes roster identity');
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM"}')->>'error'='verify_email','claim requires identity');
select shift_test_assert(public.shift_companion_action('sync_contact_email','{"email":"injected@example.com"}')->>'error'='verify_email','anonymous caller cannot sync contact email');
reset role;
select shift_test_assert(not exists(select 1 from shift_private.link_codes where consumed_at is not null),'preview never consumes the code');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
set role authenticated;
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM","email":"unverified@example.com","country_code":"66","mobile":"0812345678"}')->>'error'='verify_email','unverified email cannot claim a participant');
select shift_test_assert(public.shift_companion_action('sync_contact_email')->>'error'='verify_email','email sync requires email verification');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set role authenticated;
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM","email":"peer@example.com","country_code":"66","mobile":"0812345678"}')->>'error'='email_mismatch','code bearer cannot impersonate roster participant');
reset role;
insert into public.community_projects values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
insert into public.project_members values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
insert into public.shift_camp_updates values ('30000000-0000-0000-0000-000000000001',now(),false,'{"shipped":"Legacy project work","screenshots":["10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/legacy.jpg"]}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set role authenticated;
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM","email":"author@example.com","country_code":"66","mobile":"0812345678"}')->>'ok'='true','verified expected identity claims the roster');
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM","email":"author@example.com","country_code":"66","mobile":"0812345678"}')->>'already'='true','lost claim receipt retries are idempotent');
select shift_test_assert(public.shift_companion_action('update_contact','{"cohort_id":"10000000-0000-0000-0000-000000000001","country_code":"66","mobile":"0898765432"}')->>'mobile'='+66898765432','mobile edit normalizes the actual value');
reset role;
select shift_test_assert((select mobile from shift_private.roster where user_id='00000000-0000-0000-0000-000000000001')='+66898765432','mobile update persists rather than self-assigning its column');
-- A pending Auth change leaves email unchanged; only the final verified email is copied.
set role authenticated;
select shift_test_assert(public.shift_companion_action('sync_contact_email','{"email":"pending@example.com","user_id":"00000000-0000-0000-0000-000000000002"}')->>'email'='author@example.com','payload cannot substitute another identity or an unconfirmed email');
reset role;
update auth.users set email='confirmed-new@example.com' where id='00000000-0000-0000-0000-000000000001';
set role authenticated;
select shift_test_assert(public.shift_companion_action('sync_contact_email')->>'email'='confirmed-new@example.com','confirmed Auth address can update linked contact');
reset role;
select shift_test_assert((select email from shift_private.roster where user_id='00000000-0000-0000-0000-000000000001')='confirmed-new@example.com','contact email change persists');
select shift_test_assert((select email from shift_private.roster where user_id='00000000-0000-0000-0000-000000000002')='peer@example.com','email sync cannot modify another participant');
update auth.users set email='author@example.com' where id='00000000-0000-0000-0000-000000000001';
set role authenticated;
select public.shift_companion_action('sync_contact_email');
reset role;
create temp table shift_test_requests(payload jsonb,receipt jsonb);
grant select,update on shift_test_requests to authenticated;
insert into shift_test_requests(payload) select jsonb_build_object('cohort_id','10000000-0000-0000-0000-000000000001','update_date',(now() at time zone 'Asia/Bangkok')::date-1,'expected_revision',0,'idempotency_key','first','tried','Tested labels','learned','','help','','link','','image_path',null,'author_id','00000000-0000-0000-0000-000000000002','role','mentor');
set role authenticated;
update shift_test_requests set receipt=public.shift_companion_action('save_daily',payload);
select shift_test_assert((select receipt->>'ok' from shift_test_requests)='true','late text-only update without project saves');
select shift_test_assert((select receipt->'update'->>'author_id' from shift_test_requests)='00000000-0000-0000-0000-000000000001','caller-supplied author and role cannot change update ownership');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||jsonb_build_object('update_date',(now() at time zone 'Asia/Bangkok')::date+1,'idempotency_key','future'))->>'error' from shift_test_requests)='date_mismatch','future-date submissions are rejected');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||jsonb_build_object('update_date',(now() at time zone 'Asia/Bangkok')::date-7,'idempotency_key','before-cohort'))->>'error' from shift_test_requests)='before_cohort','updates outside cohort dates are rejected');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||'{"idempotency_key":"foreign-photo","image_path":"daily/10000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002/photo.jpg"}')->>'error' from shift_test_requests)='image','another participant photo path is rejected');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||'{"idempotency_key":"missing-photo","image_path":"daily/10000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000001/missing.jpg"}')->>'error' from shift_test_requests)='image','photo must exist before submission');
select shift_test_assert((select public.shift_companion_action('save_daily',payload)=receipt from shift_test_requests),'exact retry returns a durable receipt');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||'{"tried":"Changed"}') ->>'error' from shift_test_requests)='idempotency_mismatch','reused key cannot silently accept different content');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||'{"idempotency_key":"stale","tried":"Other device"}')->>'error' from shift_test_requests)='conflict','stale revision cannot overwrite saved work');
select shift_test_assert((select public.shift_companion_action('save_daily',payload||'{"idempotency_key":"edit","expected_revision":1,"tried":"Edited labels"}')->>'ok' from shift_test_requests)='true','explicit revision edit saves');
select shift_test_assert((select public.shift_companion_action('save_daily',payload)=receipt from shift_test_requests),'old receipt survives subsequent revisions');
select shift_test_assert((select count(*) from public.shift_daily_updates)=1,'retries and edits never duplicate the day');
select shift_test_assert((select count(*) from public.shift_daily_revisions)=2,'edits preserve server revision history');
select shift_test_assert(shift_private.can_access_image('10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/legacy.jpg',true),'legacy project owner photo access remains intact');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set role authenticated;
select shift_test_assert((select count(*) from public.shift_daily_updates)=0,'peer cannot read another participant update');
select shift_test_assert(shift_private.can_access_image('10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/legacy.jpg',false),'legacy published project photos retain cohort visibility');
select shift_test_assert(jsonb_array_length(public.shift_companion_action('history','{"cohort_id":"10000000-0000-0000-0000-000000000001"}')->'updates')=0,'peer RPC history is personal');
select shift_test_assert(not(public.shift_companion_action('today','{"cohort_id":"10000000-0000-0000-0000-000000000001"}') ? 'cohort_updates'),'Today has no peer feed');
select shift_test_assert(public.shift_companion_action('staff_roster','{"cohort_id":"10000000-0000-0000-0000-000000000001"}')->>'error'='forbidden','participant cannot fetch roster contacts');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
set role authenticated;
select shift_test_assert((select count(*) from public.shift_daily_updates)=1,'authorized cohort staff can read updates');
select shift_test_assert(not shift_private.can_access_image('daily/10000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000001/draft.jpg',false),'unsubmitted personal photos remain author-only');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
set role authenticated;
select shift_test_assert((select count(*) from public.shift_daily_updates)=0,'other cohort staff cannot read this cohort');
select shift_test_assert(public.shift_companion_action('staff_updates','{"cohort_id":"10000000-0000-0000-0000-000000000001"}')->>'error'='forbidden','staff RPC enforces cohort isolation');
select shift_test_assert(public.shift_companion_action('sync_contact_email')->>'error'='not_linked','staff-only enrollment cannot sync participant contacts');
reset role;
select set_config('request.jwt.claim.sub','',true);
set role anon;
select public.shift_companion_action('preview_code','{"code":"BBBB-BBBB-BBBB"}') from generate_series(1,30);
select shift_test_assert(public.shift_companion_action('preview_code','{"code":"ABCD-EFGH-JKLM"}')->>'error'='rate_limit','rate limit applies before a valid-code lookup');
reset role;
select shift_test_assert((select count(*) from public.shift_camp_updates where body->>'shipped'='Legacy project work')=1,'personal writes preserve legacy project records');
-- Staff pages must not skip the rest of a large cohort on the same date.
insert into auth.users(id,email,email_confirmed_at)
 select ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'fixture-'||i||'@example.com',now() from generate_series(10,40) i;
insert into public.shift_daily_updates(cohort_id,author_id,update_date,tried)
 select '10000000-0000-0000-0000-000000000001',('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
   (now() at time zone 'Asia/Bangkok')::date-1,'Synthetic staff pagination fixture' from generate_series(10,40) i;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
set role authenticated;
do $$ declare first_page jsonb; second_page jsonb; cursor jsonb; begin
 first_page := public.shift_companion_action('staff_updates','{"cohort_id":"10000000-0000-0000-0000-000000000001"}')->'updates';
 perform shift_test_assert(jsonb_array_length(first_page)=30,'staff page is bounded');
 cursor := first_page->29;
 second_page := public.shift_companion_action('staff_updates',jsonb_build_object('cohort_id','10000000-0000-0000-0000-000000000001','before',cursor->>'update_date','before_author',cursor->>'author_id'))->'updates';
 perform shift_test_assert(jsonb_array_length(second_page)=2,'staff cursor includes remaining same-date participants');
end $$;
reset role;

-- Retrying a once-successful claim must not claim success after staff revokes access.
delete from public.shift_camp_enrollments where cohort_id='10000000-0000-0000-0000-000000000001' and user_id='00000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set role authenticated;
select shift_test_assert(public.shift_companion_action('claim','{"code":"ABCD-EFGH-JKLM","email":"author@example.com","country_code":"66","mobile":"0812345678"}')->>'error'='unavailable','revoked membership cannot be reactivated by a consumed code');
select shift_test_assert(public.shift_companion_action('status')->>'linked'='false','revoked membership is not reported as linked');
select shift_test_assert(public.shift_companion_action('update_contact','{"cohort_id":"10000000-0000-0000-0000-000000000001","country_code":"66","mobile":"0812345678"}')->>'error'='not_linked','revoked membership cannot mutate contacts through companion operations');
select shift_test_assert(public.shift_companion_action('sync_contact_email')->>'error'='not_linked','revoked membership cannot sync contact email');
reset role;
rollback;
