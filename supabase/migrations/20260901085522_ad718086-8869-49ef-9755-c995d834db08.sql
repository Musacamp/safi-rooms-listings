-- 1) Move the SECURITY DEFINER admin check out of the API-exposed public schema
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admins where user_id = _user_id);
$$;

revoke all on function private.is_admin(uuid) from public;
grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;

-- 2) Repoint every policy to private.is_admin (same conditions as before)
drop policy if exists "Admins can delete revenue" on public.revenue_entries;
create policy "Admins can delete revenue" on public.revenue_entries for delete to authenticated using (private.is_admin(auth.uid()));
drop policy if exists "Admins can update revenue" on public.revenue_entries;
create policy "Admins can update revenue" on public.revenue_entries for update to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can insert revenue" on public.revenue_entries;
create policy "Admins can insert revenue" on public.revenue_entries for insert to authenticated with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can read revenue" on public.revenue_entries;
create policy "Admins can read revenue" on public.revenue_entries for select to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can delete targets" on public.revenue_targets;
create policy "Admins can delete targets" on public.revenue_targets for delete to authenticated using (private.is_admin(auth.uid()));
drop policy if exists "Admins can update targets" on public.revenue_targets;
create policy "Admins can update targets" on public.revenue_targets for update to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can insert targets" on public.revenue_targets;
create policy "Admins can insert targets" on public.revenue_targets for insert to authenticated with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can read targets" on public.revenue_targets;
create policy "Admins can read targets" on public.revenue_targets for select to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can insert audit" on public.revenue_audit;
create policy "Admins can insert audit" on public.revenue_audit for insert to authenticated with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can read audit" on public.revenue_audit;
create policy "Admins can read audit" on public.revenue_audit for select to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can delete listings" on public.listings;
create policy "Admins can delete listings" on public.listings for delete to authenticated using (private.is_admin(auth.uid()));
drop policy if exists "Admins can update listings" on public.listings;
create policy "Admins can update listings" on public.listings for update to authenticated using (private.is_admin(auth.uid())) with check (private.is_admin(auth.uid()));
drop policy if exists "Admins can insert listings" on public.listings;
create policy "Admins can insert listings" on public.listings for insert to authenticated with check (private.is_admin(auth.uid()));
drop policy if exists "Anyone can view non-archived listings" on public.listings;
create policy "Anyone can view non-archived listings" on public.listings for select using (is_archived = false or private.is_admin(auth.uid()));

drop policy if exists "Admins can read events" on public.listing_events;
create policy "Admins can read events" on public.listing_events for select to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can read visits" on public.site_visits;
create policy "Admins can read visits" on public.site_visits for select to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can read waitlist" on public.waitlist;
create policy "Admins can read waitlist" on public.waitlist for select to authenticated using (private.is_admin(auth.uid()));
drop policy if exists "Admins can delete waitlist" on public.waitlist;
create policy "Admins can delete waitlist" on public.waitlist for delete to authenticated using (private.is_admin(auth.uid()));

drop policy if exists "Admins can delete listing photos" on storage.objects;
create policy "Admins can delete listing photos" on storage.objects for delete to authenticated using (bucket_id = 'listing-photos' and private.is_admin(auth.uid()));
drop policy if exists "Admins can update listing photos" on storage.objects;
create policy "Admins can update listing photos" on storage.objects for update to authenticated using (bucket_id = 'listing-photos' and private.is_admin(auth.uid()));
drop policy if exists "Admins can upload listing photos" on storage.objects;
create policy "Admins can upload listing photos" on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and private.is_admin(auth.uid()));

-- 3) Stop admin-identity enumeration: signed-in users may only see their own row
drop policy if exists "Authenticated users can see admins list" on public.admins;
create policy "Users can check their own admin status"
  on public.admins for select to authenticated
  using (user_id = auth.uid() or private.is_admin(auth.uid()));

drop function if exists public.is_admin(uuid);

-- 4) Harden waitlist writes against bulk/spam phone harvesting
delete from public.waitlist w
where w.ctid <> (
  select w2.ctid from public.waitlist w2
  where w2.listing_id = w.listing_id and lower(btrim(w2.phone)) = lower(btrim(w.phone))
  order by w2.created_at asc limit 1
);

create unique index if not exists waitlist_listing_phone_uniq
  on public.waitlist (listing_id, lower(btrim(phone)));

alter table public.waitlist
  drop constraint if exists waitlist_phone_format_chk,
  drop constraint if exists waitlist_name_len_chk;
alter table public.waitlist
  add constraint waitlist_phone_format_chk check (
    btrim(phone) ~ '^[+0-9][0-9 ()/+.-]{5,29}$'
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 24
  ),
  add constraint waitlist_name_len_chk check (char_length(btrim(name)) between 2 and 120);

drop policy if exists "Anyone can join waitlist for occupied listings" on public.waitlist;
create policy "Anyone can join waitlist for occupied listings"
  on public.waitlist for insert to anon, authenticated
  with check (exists (
    select 1 from public.listings l
    where l.id = waitlist.listing_id
      and l.is_archived = false
      and l.is_available = false
  ));