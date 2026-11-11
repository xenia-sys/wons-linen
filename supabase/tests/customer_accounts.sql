-- Isolated PostgreSQL fixtures only; never execute against hosted Supabase.
begin;
do $$
declare alice uuid := gen_random_uuid(); bob uuid := gen_random_uuid();
  unconfirmed uuid := gen_random_uuid();
  alice_session uuid := gen_random_uuid(); bob_session uuid := gen_random_uuid();
  unconfirmed_session uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, email_confirmed_at) values
    (alice, 'alice-fixture@example.invalid', now()),
    (bob, 'bob-fixture@example.invalid', now()),
    (unconfirmed, 'unconfirmed-fixture@example.invalid', null);
  insert into auth.sessions (id,user_id) values
    (alice_session,alice), (bob_session,bob), (unconfirmed_session,unconfirmed);
  insert into public.customer_order_summaries (user_id,order_number,status,total_vnd) values
    (alice,'WONS-A','confirmed',100000),
    (bob,'WONS-B','pending',200000),
    (null,'WONS-GUEST','confirmed',300000);
  insert into public.customer_addresses (user_id,kind,recipient,line1,city,country) values
    (bob,'shipping','Fixture Bob','Test street','Test city','Vietnam');
  perform set_config('wons.test.alice_id',alice::text,true);
  perform set_config('wons.test.bob_id',bob::text,true);
  perform set_config('wons.test.unconfirmed_id',unconfirmed::text,true);
  perform set_config('wons.test.alice_session',alice_session::text,true);
  perform set_config('wons.test.alice',jsonb_build_object('sub',alice,'session_id',alice_session)::text,true);
  perform set_config('wons.test.bob',jsonb_build_object('sub',bob,'session_id',bob_session)::text,true);
  perform set_config('wons.test.unconfirmed',jsonb_build_object('sub',unconfirmed,'session_id',unconfirmed_session)::text,true);
end $$;

set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin
  begin perform count(*) from public.customer_addresses; raise exception 'Guest read addresses';
    exception when insufficient_privilege then null; end;
  begin perform count(*) from public.customer_order_summaries; raise exception 'Guest read orders';
    exception when insufficient_privilege then null; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.alice'),true);
do $$
declare alice uuid := current_setting('wons.test.alice_id')::uuid;
  bob uuid := current_setting('wons.test.bob_id')::uuid;
  changed integer;
begin
  if (select array_agg(order_number) from public.customer_order_summaries) is distinct from array['WONS-A'] then
    raise exception 'Order isolation or guest denial failed';
  end if;
  if exists (select 1 from public.customer_addresses) then raise exception 'Read another customer address'; end if;
  insert into public.customer_addresses (user_id,kind,recipient,line1,city,country)
    values (alice,'shipping','Fixture Alice','First line','City','Vietnam');
  insert into public.customer_addresses (user_id,kind,recipient,line1,city,country)
    values (alice,'shipping','Fixture Alice','Updated line','City','Vietnam')
    on conflict (user_id,kind) do update set line1 = excluded.line1;
  if (select line1 from public.customer_addresses where kind='shipping') <> 'Updated line' then
    raise exception 'Address update failed';
  end if;
  insert into public.customer_addresses (user_id,kind,recipient,line1,city,country)
    values (alice,'billing','Fixture Alice','Billing line','City','Vietnam');
  delete from public.customer_addresses where kind='billing';
  if (select count(*) from public.customer_addresses) <> 1 then raise exception 'Own address removal failed'; end if;
  update public.customer_addresses set line1 = 'Cross-account edit' where user_id=bob;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Edited another customer address'; end if;
  delete from public.customer_addresses where user_id=bob;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Deleted another customer address'; end if;
  begin update public.customer_addresses set user_id=bob where user_id=alice;
    raise exception 'Reassigned address ownership'; exception when insufficient_privilege then null; end;
  begin insert into public.customer_addresses (user_id,kind,recipient,line1,city,country)
    values (bob,'billing','Fixture','First line','City','Vietnam');
    raise exception 'Inserted another customer address'; exception when insufficient_privilege then null; end;
  begin insert into public.customer_order_summaries (user_id,order_number,status,total_vnd)
    values (alice,'WONS-FAKE','confirmed',1);
    raise exception 'Customer created order'; exception when insufficient_privilege then null; end;
  begin update public.customer_order_summaries set total_vnd = 1 where user_id=alice;
    raise exception 'Customer modified order total'; exception when insufficient_privilege then null; end;
  if public.staff_profile() is not null then raise exception 'Customer gained staff privileges'; end if;
end $$;

select set_config('request.jwt.claims',current_setting('wons.test.unconfirmed'),true);
do $$ begin
  begin insert into public.customer_addresses (user_id,kind,recipient,line1,city,country)
    values (current_setting('wons.test.unconfirmed_id')::uuid,'shipping','Fixture','First line','City','Vietnam');
    raise exception 'Unconfirmed email saved address'; exception when insufficient_privilege then null; end;
end $$;

reset role;
delete from auth.sessions where id=current_setting('wons.test.alice_session')::uuid;
set local role authenticated;
select set_config('request.jwt.claims',current_setting('wons.test.alice'),true);
do $$ begin
  if exists (select 1 from public.customer_addresses) or exists (select 1 from public.customer_order_summaries) then
    raise exception 'Revoked session retained account access';
  end if;
end $$;
rollback;
select 'PASS: own address CRUD, guest and cross-account denial, verified email/live session, read-only orders and staff separation' as result;
