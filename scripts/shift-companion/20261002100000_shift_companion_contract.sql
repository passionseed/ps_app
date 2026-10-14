-- Correct the companion contract without changing legacy project/day updates.
-- Personal updates are author/staff-only. Late submissions keep their original
-- cohort date; there is no inherited 19:00 or seven-day gate.
create table shift_private.daily_receipts (
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  author_id uuid not null references auth.users(id),
  idempotency_key text not null,
  request_hash text not null,
  receipt jsonb not null,
  primary key (cohort_id, author_id, idempotency_key)
);
revoke all on shift_private.daily_receipts from public, anon, authenticated;
drop policy if exists shift_daily_read on public.shift_daily_updates;
create policy shift_daily_read on public.shift_daily_updates for select to authenticated
  using (author_id = auth.uid() or shift_private.is_staff(cohort_id));

create or replace function shift_private.companion_action(p_action text, p_payload jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  raw_headers text;
  ip text := '';
  actor text;
  attempts integer;
  first_at timestamptz;
  wait_minutes integer;
  canonical text;
  code_hash text;
  link_row shift_private.link_codes;
  person shift_private.roster;
  cohort public.shift_camp_cohorts;
  v_email text;
  v_confirmed timestamptz;
  cc text;
  nn text;
  mobile text;
  cid uuid;
  v_today date;
  local_time time;
  reason text;
  existing public.shift_daily_updates;
  expected integer;
  v_tried text;
  v_learned text;
  v_help text;
  v_link text;
  v_image text;
  v_name text;
  v_starts date;
  v_ends date;
  v_roster uuid;
  fresh_code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
  rnd integer;
  request_hash text;
  receipt jsonb;
  target_date date;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if p_action = 'status' then
    if uid is null then return jsonb_build_object('ok', true, 'linked', false, 'email', null, 'mobile', null, 'cohorts', '[]'::jsonb); end if;
    return jsonb_build_object(
      'ok', true,
      'linked', exists(select 1 from shift_private.roster r join public.shift_camp_enrollments e on e.cohort_id = r.cohort_id and e.user_id = r.user_id where r.user_id = uid and e.companion),
      'email', (select r.email from shift_private.roster r where r.user_id = uid order by r.claimed_at desc nulls last limit 1),
      'mobile', (select r.mobile from shift_private.roster r where r.user_id = uid order by r.claimed_at desc nulls last limit 1),
      'cohorts', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'mobile', r.mobile) order by r.claimed_at desc)
        from shift_private.roster r
        join public.shift_camp_cohorts c on c.id = r.cohort_id
        join public.shift_camp_enrollments e on e.cohort_id = r.cohort_id and e.user_id = r.user_id
        where r.user_id = uid and e.companion
      ), '[]'::jsonb)
    );
  end if;

  if p_action in ('preview_code', 'claim') then
    begin
      raw_headers := current_setting('request.headers', true);
      ip := btrim(split_part(coalesce(raw_headers::json->>'x-forwarded-for', ''), ',', 1));
    exception when others then
      ip := '';
    end;
    actor := coalesce(uid::text, nullif(ip, ''), 'anon') || ':code';
    perform pg_advisory_xact_lock(hashtextextended(actor, 0));
    select count(*), min(attempted_at) into attempts, first_at
      from shift_private.link_attempts
      where actor_key = actor and attempted_at > now() - interval '15 minutes';
    if attempts >= 30 then
      wait_minutes := greatest(1, ceil(extract(epoch from (first_at + interval '15 minutes' - now())) / 60.0)::integer);
      return jsonb_build_object('ok', false, 'error', 'rate_limit', 'wait_minutes', wait_minutes);
    end if;
    insert into shift_private.link_attempts(actor_key) values (actor);
    delete from shift_private.link_attempts where actor_key = actor and attempted_at < now() - interval '1 day';
    canonical := upper(regexp_replace(coalesce(p_payload->>'code', ''), '[^A-Za-z0-9]', '', 'g'));
    if canonical = '' then
      return jsonb_build_object('ok', false, 'error', 'empty');
    end if;
    if length(canonical) <> 12 or canonical !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$' then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    code_hash := encode(extensions.digest(convert_to(canonical, 'UTF8'), 'sha256'), 'hex');
  end if;

  if p_action = 'preview_code' then
    select c.name, c.starts_on, c.ends_on
      into v_name, v_starts, v_ends
    from shift_private.link_codes lc
    join shift_private.roster r on r.id = lc.roster_id
    join public.shift_camp_cohorts c on c.id = r.cohort_id
    where lc.code_hash = companion_action.code_hash
      and (lc.consumed_at is null or r.user_id = uid)
      and lc.revoked_at is null
      and lc.expires_at > now()
      and (r.user_id is null or r.user_id = uid);
    if v_name is null then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    return jsonb_build_object('ok', true, 'cohort_name', v_name, 'starts_on', v_starts, 'ends_on', v_ends);
  end if;

  if p_action = 'claim' then
    if uid is null then return jsonb_build_object('ok', false, 'error', 'verify_email'); end if;
    select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = uid;
    if v_confirmed is null or v_email is null then
      return jsonb_build_object('ok', false, 'error', 'verify_email');
    end if;
    if lower(btrim(coalesce(p_payload->>'email', ''))) <> lower(btrim(v_email)) then
      return jsonb_build_object('ok', false, 'error', 'email_mismatch');
    end if;

    select lc.* into link_row
    from shift_private.link_codes lc
    where lc.code_hash = companion_action.code_hash;
    if not found then return jsonb_build_object('ok', false, 'error', 'unavailable'); end if;
    select r.* into person from shift_private.roster r where r.id = link_row.roster_id;
    perform pg_advisory_xact_lock(hashtextextended(person.cohort_id::text || ':' || uid::text, 0));
    select r.* into person from shift_private.roster r where r.id = link_row.roster_id for update;
    select lc.* into link_row from shift_private.link_codes lc where lc.id = link_row.id for update;
    select c.* into cohort from public.shift_camp_cohorts c where c.id = person.cohort_id;

    if person.user_id = uid then
      if not exists(select 1 from public.shift_camp_enrollments e
        where e.cohort_id = person.cohort_id and e.user_id = uid and e.companion) then
        return jsonb_build_object('ok', false, 'error', 'unavailable');
      end if;
      return jsonb_build_object('ok', true, 'already', true, 'user_id', uid, 'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on));
    end if;
    if person.user_id is not null or link_row.consumed_at is not null or link_row.revoked_at is not null or link_row.expires_at <= now() then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;

    if person.email is null or lower(btrim(person.email)) <> lower(btrim(v_email)) then
      return jsonb_build_object('ok', false, 'error', 'email_mismatch');
    end if;

    if exists(select 1 from shift_private.roster r where r.cohort_id = person.cohort_id and r.user_id = uid and r.id <> person.id) then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    cc := regexp_replace(coalesce(p_payload->>'country_code', ''), '\D', '', 'g');
    cc := regexp_replace(cc, '^0+', '');
    nn := regexp_replace(coalesce(p_payload->>'mobile', ''), '\D', '', 'g');
    if left(nn, 1) = '0' then nn := substr(nn, 2); end if;
    if cc is null or length(cc) < 1 or length(cc) > 3 or nn is null or length(nn) < 6 or length(nn) > 12
       or length(cc || nn) < 8 or length(cc || nn) > 15 then
      return jsonb_build_object('ok', false, 'error', 'mobile');
    end if;
    mobile := '+' || cc || nn;

    update shift_private.roster
      set user_id = uid, email = lower(btrim(v_email)), mobile = companion_action.mobile, claimed_at = now()
      where id = person.id and user_id is null;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    update shift_private.link_codes set consumed_at = now() where id = link_row.id and consumed_at is null;
    insert into public.shift_camp_enrollments(cohort_id, user_id, role, companion)
      values (person.cohort_id, uid, 'participant', true)
      on conflict (cohort_id, user_id) do update set companion = true;
    return jsonb_build_object('ok', true, 'already', false, 'user_id', uid, 'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on));
  end if;

  if uid is null then return jsonb_build_object('ok', false, 'error', 'verify_email'); end if;

  if p_action = 'sync_contact_email' then
    select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = uid;
    if v_confirmed is null or nullif(btrim(v_email), '') is null then
      return jsonb_build_object('ok', false, 'error', 'verify_email');
    end if;
    if not exists (
      select 1 from shift_private.roster r join public.shift_camp_enrollments e
        on e.cohort_id = r.cohort_id and e.user_id = r.user_id
      where r.user_id = uid and e.companion
    ) then
      return jsonb_build_object('ok', false, 'error', 'not_linked');
    end if;
    -- Copy only the caller's server-confirmed Auth email. Ignore payload identities/addresses.
    update shift_private.roster r set email = lower(btrim(v_email))
      where r.user_id = uid and exists (
        select 1 from public.shift_camp_enrollments e
        where e.cohort_id = r.cohort_id and e.user_id = uid and e.companion
      );
    return jsonb_build_object('ok', true, 'user_id', uid, 'email', lower(btrim(v_email)));
  end if;

  if p_action in ('issue_code', 'reissue_code') then
    if p_action = 'issue_code' then
      cid := nullif(p_payload->>'cohort_id', '')::uuid;
      if cid is null or not shift_private.is_staff(cid) then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
      end if;
      v_email := lower(btrim(coalesce(p_payload->>'email', '')));
      if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
        return jsonb_build_object('ok', false, 'error', 'email');
      end if;
      insert into shift_private.roster(cohort_id, email) values (cid, v_email) returning id into v_roster;
    else
      v_roster := nullif(p_payload->>'roster_id', '')::uuid;
      select r.* into person from shift_private.roster r where r.id = v_roster for update;
      if not found or person.user_id is not null or not shift_private.is_staff(person.cohort_id) then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
      end if;
      v_roster := person.id;
      update shift_private.link_codes
        set revoked_at = now()
        where roster_id = v_roster and consumed_at is null and revoked_at is null;
    end if;
    fresh_code := '';
    for i in 1..12 loop
      rnd := get_byte(extensions.gen_random_bytes(1), 0) % 32;
      fresh_code := fresh_code || substr(alphabet, rnd + 1, 1);
    end loop;
    insert into shift_private.link_codes(roster_id, code_hash, expires_at, issued_by)
      values (
        v_roster,
        encode(extensions.digest(convert_to(fresh_code, 'UTF8'), 'sha256'), 'hex'),
        now() + interval '30 days',
        uid
      );
    -- Raw code is returned once to the staff caller. Do not log this response.
    return jsonb_build_object(
      'ok', true,
      'roster_id', v_roster,
      'code', substr(fresh_code, 1, 4) || '-' || substr(fresh_code, 5, 4) || '-' || substr(fresh_code, 9, 4),
      'expires_at', now() + interval '30 days'
    );
  end if;

  cid := nullif(p_payload->>'cohort_id', '')::uuid;
  if p_action in ('staff_updates', 'staff_roster') then
    if cid is null or not shift_private.is_staff(cid) then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
    if p_action = 'staff_roster' then
      return jsonb_build_object('ok', true, 'participants', coalesce((
        select jsonb_agg(to_jsonb(r)) from shift_private.roster r where r.cohort_id = cid
      ), '[]'::jsonb));
    end if;
    return jsonb_build_object('ok', true, 'updates', coalesce((
      select jsonb_agg(to_jsonb(u)) from (
        select * from public.shift_daily_updates where cohort_id = cid
          and (nullif(p_payload->>'before', '') is null
            or update_date < (p_payload->>'before')::date
            or (update_date = (p_payload->>'before')::date
              and nullif(p_payload->>'before_author', '') is not null
              and author_id > (p_payload->>'before_author')::uuid))
        order by update_date desc, author_id limit 30
      ) u
    ), '[]'::jsonb));
  end if;
  if cid is null or not exists (
    select 1 from shift_private.roster r join public.shift_camp_enrollments e
      on e.cohort_id = r.cohort_id and e.user_id = r.user_id
    where r.cohort_id = cid and r.user_id = uid and e.companion
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  select c.* into cohort from public.shift_camp_cohorts c where c.id = cid;
  v_today := (now() at time zone 'Asia/Bangkok')::date;
  local_time := (now() at time zone 'Asia/Bangkok')::time;
  reason := case
    when v_today < cohort.starts_on then 'before_cohort'
    when cohort.ends_on is not null and v_today > cohort.ends_on then 'after_cohort'
    else null
  end;

  if p_action = 'update_contact' then
    cc := regexp_replace(coalesce(p_payload->>'country_code', ''), '\D', '', 'g');
    cc := regexp_replace(cc, '^0+', '');
    nn := regexp_replace(coalesce(p_payload->>'mobile', ''), '\D', '', 'g');
    if left(nn, 1) = '0' then nn := substr(nn, 2); end if;
    if length(cc) < 1 or length(cc) > 3 or length(nn) < 6 or length(nn) > 12 or length(cc || nn) < 8 or length(cc || nn) > 15 then
      return jsonb_build_object('ok', false, 'error', 'mobile');
    end if;
    mobile := '+' || cc || nn;
    update shift_private.roster set mobile = companion_action.mobile where cohort_id = cid and user_id = uid;
    return jsonb_build_object('ok', true, 'mobile', mobile);
  end if;

  if p_action = 'today' then
    return jsonb_build_object(
      'ok', true,
      'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on),
      'today', v_today,
      'deadline', null,
      'session', '19:00–21:00',
      'window_open', reason is null,
      'window_reason', reason,
      'mine', (
        select jsonb_build_object(
          'id', u.id, 'author_id', u.author_id,
          'author_name', coalesce(nullif(p.full_name, ''), 'Participant'),
          'mine', true, 'update_date', u.update_date, 'tried', u.tried, 'learned', u.learned, 'help', u.help,
          'link', u.link, 'image_path', u.image_path, 'revision', u.revision, 'edited', u.revision > 1,
          'submitted_at', u.submitted_at, 'updated_at', u.updated_at
        )
        from public.shift_daily_updates u
        left join public.profiles p on p.id = u.author_id
        where u.cohort_id = cid and u.author_id = uid and u.update_date = v_today
      ),
      'history', coalesce((
        select jsonb_agg(to_jsonb(h)) from (
          select u.id, u.author_id, coalesce(nullif(p.full_name, ''), 'Participant') as author_name,
            true as mine, u.update_date, u.tried, u.learned, u.help, u.link, u.image_path,
            u.revision, (u.revision > 1) as edited, u.submitted_at, u.updated_at
          from public.shift_daily_updates u
          left join public.profiles p on p.id = u.author_id
          where u.cohort_id = cid and u.author_id = uid and u.update_date < v_today
          order by u.update_date desc
          limit 5
        ) h
      ), '[]'::jsonb)
    );
  end if;

  if p_action = 'history' then
    return jsonb_build_object('ok', true, 'updates', coalesce((
      select jsonb_agg(to_jsonb(h)) from (
        select u.id, u.author_id, coalesce(nullif(p.full_name, ''), 'Participant') as author_name,
          true as mine, u.update_date, u.tried, u.learned, u.help, u.link, u.image_path,
          u.revision, (u.revision > 1) as edited, u.submitted_at, u.updated_at
        from public.shift_daily_updates u
        left join public.profiles p on p.id = u.author_id
        where u.cohort_id = cid and u.author_id = uid
          and (nullif(p_payload->>'before', '') is null or u.update_date < (p_payload->>'before')::date)
        order by u.update_date desc
        limit 30
      ) h
    ), '[]'::jsonb));
  end if;

  if p_action = 'save_daily' then
    target_date := nullif(p_payload->>'update_date', '')::date;
    if target_date is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
    perform pg_advisory_xact_lock(hashtextextended(cid::text || ':' || uid::text, 0));
    request_hash := encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
    select r.receipt into receipt from shift_private.daily_receipts r
      where r.cohort_id = cid and r.author_id = uid and r.idempotency_key = p_payload->>'idempotency_key'
        and r.request_hash = companion_action.request_hash;
    if found then return jsonb_build_object('ok', true, 'update', receipt); end if;
    if exists(select 1 from shift_private.daily_receipts r where r.cohort_id = cid and r.author_id = uid
      and r.idempotency_key = p_payload->>'idempotency_key') then
      return jsonb_build_object('ok', false, 'error', 'idempotency_mismatch');
    end if;
    if target_date > v_today then return jsonb_build_object('ok', false, 'error', 'date_mismatch'); end if;
    if target_date < cohort.starts_on then return jsonb_build_object('ok', false, 'error', 'before_cohort'); end if;
    if cohort.ends_on is not null and target_date > cohort.ends_on then
      return jsonb_build_object('ok', false, 'error', 'after_cohort');
    end if;
    v_tried := btrim(coalesce(p_payload->>'tried', ''));
    v_learned := nullif(btrim(coalesce(p_payload->>'learned', '')), '');
    v_help := nullif(btrim(coalesce(p_payload->>'help', '')), '');
    v_link := nullif(btrim(coalesce(p_payload->>'link', '')), '');
    v_image := nullif(btrim(coalesce(p_payload->>'image_path', '')), '');
    if v_tried = '' then return jsonb_build_object('ok', false, 'error', 'tried'); end if;
    if length(v_tried) > 2000 or coalesce(length(v_learned), 0) > 1000 or coalesce(length(v_help), 0) > 1000 then
      return jsonb_build_object('ok', false, 'error', 'length');
    end if;
    if v_link is not null and v_link !~ '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$' then
      return jsonb_build_object('ok', false, 'error', 'link');
    end if;
    if v_image is not null and v_image !~ ('^daily/' || cid::text || '/' || uid::text || '/[^/]+$') then
      return jsonb_build_object('ok', false, 'error', 'image');
    end if;
    if v_image is not null and not exists(select 1 from storage.objects where bucket_id = 'shift-camp' and name = v_image) then
      return jsonb_build_object('ok', false, 'error', 'image');
    end if;
    if nullif(p_payload->>'idempotency_key', '') is null or length(p_payload->>'idempotency_key') > 80 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    expected := coalesce((p_payload->>'expected_revision')::integer, 0);

    select u.* into existing
    from public.shift_daily_updates u
    where u.cohort_id = cid and u.author_id = uid and u.update_date = target_date
    for update;
    if found and existing.revision <> expected then
      return jsonb_build_object('ok', false, 'error', 'conflict', 'server', jsonb_build_object(
        'id', existing.id, 'author_id', existing.author_id, 'author_name', 'You', 'mine', true,
        'update_date', existing.update_date, 'tried', existing.tried, 'learned', existing.learned, 'help', existing.help,
        'link', existing.link, 'image_path', existing.image_path, 'revision', existing.revision,
        'edited', existing.revision > 1, 'submitted_at', existing.submitted_at, 'updated_at', existing.updated_at
      ));
    end if;
    if not found and expected <> 0 then
      return jsonb_build_object('ok', false, 'error', 'conflict');
    end if;

    if not found then
      insert into public.shift_daily_updates(
        cohort_id, author_id, update_date, tried, learned, help, link, image_path, revision, idempotency_key
      ) values (
        cid, uid, target_date, v_tried, v_learned, v_help, v_link, v_image, 1, p_payload->>'idempotency_key'
      ) returning * into existing;
    else
      update public.shift_daily_updates u
        set tried = v_tried, learned = v_learned, help = v_help, link = v_link, image_path = v_image,
            revision = u.revision + 1, idempotency_key = p_payload->>'idempotency_key', updated_at = now()
        where u.id = existing.id
        returning * into existing;
    end if;
    insert into public.shift_daily_revisions(
      update_id, cohort_id, author_id, revision, tried, learned, help, link, image_path
    ) values (
      existing.id, cid, uid, existing.revision, existing.tried, existing.learned, existing.help, existing.link, existing.image_path
    );
    receipt := jsonb_build_object(
      'id', existing.id, 'author_id', existing.author_id, 'author_name', 'You', 'mine', true,
      'update_date', existing.update_date, 'tried', existing.tried, 'learned', existing.learned, 'help', existing.help,
      'link', existing.link, 'image_path', existing.image_path, 'revision', existing.revision,
      'edited', existing.revision > 1, 'submitted_at', existing.submitted_at, 'updated_at', existing.updated_at
    );
    insert into shift_private.daily_receipts(cohort_id, author_id, idempotency_key, request_hash, receipt)
      values (cid, uid, p_payload->>'idempotency_key', request_hash, receipt);
    return jsonb_build_object('ok', true, 'update', receipt);
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid');
exception
  when invalid_text_representation or datetime_field_overflow then
    return jsonb_build_object('ok', false, 'error', 'invalid');
end $$;

revoke all on function shift_private.companion_action(text, jsonb) from public, anon, authenticated;

create or replace function public.shift_companion_action(p_action text, p_payload jsonb default '{}')
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select shift_private.companion_action(p_action, coalesce(p_payload, '{}'::jsonb))
$$;
revoke all on function public.shift_companion_action(text, jsonb) from public;
grant execute on function public.shift_companion_action(text, jsonb) to anon, authenticated;

-- Personal photos live under daily/{cohort}/{user}/file.
-- Personal photos are private to their author and authorized cohort staff.
create or replace function shift_private.can_access_image(path text, writing boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid; pid uuid; owner uuid; begin
  if split_part(path, '/', 1) = 'daily' then
    cid := split_part(path, '/', 2)::uuid;
    owner := split_part(path, '/', 3)::uuid;
    if writing then
      return auth.uid() = owner and exists(select 1 from shift_private.roster r
        join public.shift_camp_enrollments e on e.cohort_id = r.cohort_id and e.user_id = r.user_id
        where r.cohort_id = cid and r.user_id = auth.uid() and e.companion);
    end if;
    return (auth.uid() = owner and shift_private.can_read(cid)) or
      (shift_private.is_staff(cid) and (
        exists(select 1 from public.shift_daily_updates u where u.cohort_id = cid and u.author_id = owner and u.image_path = path)
        or exists(select 1 from public.shift_daily_revisions r where r.cohort_id = cid and r.author_id = owner and r.image_path = path)
      ));
  end if;
  cid := split_part(path, '/', 1)::uuid;
  pid := split_part(path, '/', 2)::uuid;
  return shift_private.project_cohort(pid) = cid and shift_private.can_read(cid) and
    (case when writing then shift_private.my_project(cid, auth.uid()) = pid
      else shift_private.is_staff(cid) or shift_private.my_project(cid, auth.uid()) = pid
        or exists(select 1 from public.shift_camp_updates where project_id = pid and published_at is not null and not hidden and (body->'screenshots') ? path)
    end);
exception when invalid_text_representation then return false; end $$;
revoke all on function shift_private.can_access_image(text, boolean) from public;
grant execute on function shift_private.can_access_image(text, boolean) to anon, authenticated;
