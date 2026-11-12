-- Isolated fixtures. No real accounts or Storage objects are touched.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  owner_session uuid := gen_random_uuid();
  editor_session uuid := gen_random_uuid();
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (owner_id,'owner-cover@example.invalid',now()), (editor_id,'editor-cover@example.invalid',now());
  insert into auth.sessions(id,user_id) values (owner_session,owner_id), (editor_session,editor_id);
  insert into public.staff_members(email,role) values
    ('owner-cover@example.invalid','owner'), ('editor-cover@example.invalid','marketing_editor');
  perform set_config('wons.test.owner', jsonb_build_object('sub',owner_id,'session_id',owner_session)::text,true);
  perform set_config('wons.test.editor', jsonb_build_object('sub',editor_id,'session_id',editor_session)::text,true);
  perform set_config('wons.test.cover1', 'home-hero/' || gen_random_uuid()::text || '.webp', true);
  perform set_config('wons.test.cover2', 'home-hero/' || gen_random_uuid()::text || '.webp', true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.owner'),true);
do $$
begin
  begin
    insert into public.storefront_images values ('home-hero',current_setting('wons.test.cover1'),'Unuploaded photo');
    raise exception 'Owner published an unuploaded cover';
  exception when insufficient_privilege then null;
  end;
  insert into storage.objects(bucket_id,name) values
    ('storefront-images',current_setting('wons.test.cover1')), ('storefront-images',current_setting('wons.test.cover2'));
  begin
    insert into public.storefront_images values ('home-men',current_setting('wons.test.cover1'),'Wrong area');
    raise exception 'Cover used an object from a different slot';
  exception when check_violation then null;
  end;
  insert into public.storefront_images values ('home-hero',current_setting('wons.test.cover1'),'First photo');
  insert into public.storefront_images values ('home-hero',current_setting('wons.test.cover2'),'Second photo')
    on conflict (id) do update set storage_path=excluded.storage_path,alt=excluded.alt;
end $$;

select set_config('request.jwt.claims',current_setting('wons.test.editor'),true);
do $$
begin
  begin
    insert into storage.objects(bucket_id,name) values ('storefront-images','home-men/' || gen_random_uuid()::text || '.webp');
    raise exception 'Marketing uploaded a storefront cover';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.storefront_images values ('home-hero',current_setting('wons.test.cover1'),'Editor photo')
      on conflict (id) do update set alt=excluded.alt;
    raise exception 'Marketing published a storefront cover';
  exception when insufficient_privilege then null;
  end;
  delete from public.storefront_images where id='home-hero';
  if found then raise exception 'Marketing removed a storefront cover'; end if;
end $$;

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$
begin
  if not exists (select 1 from public.storefront_images
    where id='home-hero' and storage_path=current_setting('wons.test.cover2') and alt='Second photo')
  then raise exception 'Guest cannot see the replacement photo'; end if;
  begin
    update public.storefront_images set alt='Guest write' where id='home-hero';
    raise exception 'Guest can write cover metadata';
  exception when insufficient_privilege then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.owner'),true);
do $$
begin
  delete from public.storefront_images where id='home-hero';
  if not found then raise exception 'Owner could not restore the default'; end if;
  if (select array_agg(action order by id) from public.activity_log
    where entity_type='storefront_images' and entity_id='home-hero')
    is distinct from array['INSERT','UPDATE','DELETE']
  then raise exception 'Cover changes did not produce the expected history'; end if;
end $$;
rollback;
select 'PASS: storefront cover publishing, guest read, staff restrictions, restore and audit' as result;
