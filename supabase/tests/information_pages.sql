-- Isolated fixtures. These edits and staff records must never run in production.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  owner_session uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_id,'owner-pages@example.invalid',now()), (editor_id,'editor-pages@example.invalid',now());
  insert into auth.sessions(id,user_id) values (owner_session,owner_id), (editor_session,editor_id);
  insert into public.staff_members(email,role) values
    ('owner-pages@example.invalid','owner'), ('editor-pages@example.invalid','marketing_editor');
  perform set_config('wons.test.pages_owner', jsonb_build_object('sub',owner_id,'session_id',owner_session)::text,true);
  perform set_config('wons.test.pages_editor', jsonb_build_object('sub',editor_id,'session_id',editor_session)::text,true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.pages_owner'),true);
do $$
begin
  update public.information_pages set title='A new WONS story', body=E'First paragraph.\n\nSecond paragraph.'
    where id='our-story' and version=1;
  if not found then raise exception 'Owner could not publish the page'; end if;
  update public.information_pages set title='Stale change' where id='our-story' and version=1;
  if found then raise exception 'A stale revision overwrote the page'; end if;
  update public.information_pages set title='A new WONS story' where id='our-story' and version=2;
  if not found then raise exception 'Current revision unexpectedly changed'; end if;
  begin
    update public.information_pages set id='privacy' where id='our-story';
    raise exception 'Owner changed a page identifier';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.information_pages where id='client-care';
    raise exception 'Owner deleted the Client care page';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.activity_log where entity_type='information_pages') <> 1
    or not exists (select 1 from public.activity_log where entity_type='information_pages'
      and entity_id='our-story' and action='UPDATE' and actor_email='owner-pages@example.invalid'
      and before_data->>'title'='Linen, at your own pace.' and after_data->>'title'='A new WONS story') then
    raise exception 'Publication history does not match the change';
  end if;
end $$;

select set_config('request.jwt.claims',current_setting('wons.test.pages_editor'),true);
do $$
begin
  update public.information_pages set body='Marketing change' where id='client-care';
  if found then raise exception 'Marketing was allowed to publish'; end if;
end $$;
select set_config('request.jwt.claims','{}',true);
do $$
begin
  update public.information_pages set body='Customer change' where id='client-care';
  if found then raise exception 'A non-staff account was allowed to publish'; end if;
end $$;

set local role anon;
do $$
begin
  if not exists (select 1 from public.information_pages where id='our-story' and title='A new WONS story' and version=2)
    or not exists (select 1 from public.information_pages where id='client-care' and version=1) then
    raise exception 'Public reads did not reflect the published update';
  end if;
  begin
    update public.information_pages set body='Guest change' where id='our-story';
    raise exception 'Guest was allowed to publish';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
select 'PASS: information page publication, public read, stale edit protection, staff rights and audit' as result;
