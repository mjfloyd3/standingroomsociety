-- Visitor reports ("How did it go for you?").
-- Paste into the Supabase SQL editor and run. Safe to re-run: it only
-- creates what's missing and replaces the policies, grants and trigger.
--
-- Design: browsers talk to this table directly with the public key, so the
-- rules below are the security boundary.
--   * No free text: every column is a fixed choice, a bounded number, or
--     one of the built-in pen names.
--   * Visitors sign in anonymously; a device can only add, edit (price and
--     standing-room answers only) or delete its own reports.
--   * Who submitted a report (user_id) and when (created_at) are set by the
--     database and never readable or writable from the browser.
--   * At most 10 reports per device per hour.

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  show_slug text not null check (show_slug ~ '^[a-z0-9-]{1,200}$'),
  method text not null check (method in ('rush', 'standing_room', 'lottery')),
  got_ticket boolean not null,
  price_paid numeric(7, 2) check (price_paid between 0 and 1000),
  standing_room_available boolean,
  shared_by text not null check (shared_by in (
    'Matinee Mavis', 'Balcony Bartholomew', 'Understudy Ursula', 'Encore Eugene',
    'Mezzanine Marguerite', 'Overture Otis', 'Curtain Call Clementine', 'Footlight Felix',
    'Intermission Ida', 'Spotlight Sylvester', 'Marquee Margot', 'Rush Line Rosalind',
    'Standing Room Stanley', 'Box Office Beatrix', 'Stage Door Dorothea', 'Playbill Penelope',
    'Ghost Light Gideon', 'Half Hour Hazel', 'Callback Cordelia', 'Downstage Delphine',
    'Upstage Ulysses', 'Jazz Hands Jasper', 'Prop Table Prudence', 'Places Please Percival'
  )),
  created_at timestamptz not null default now(),
  -- A price only makes sense if they got a ticket.
  constraint price_needs_ticket check (got_ticket or price_paid is null),
  -- The standing-room question isn't asked when standing room is the method.
  constraint no_sro_answer_for_sro check (method <> 'standing_room' or standing_room_available is null)
);

create index if not exists reports_show_slug_created_at_idx
  on public.reports (show_slug, created_at desc);

alter table public.reports enable row level security;

-- ---------- Row level security ----------
drop policy if exists "Anyone can read reports" on public.reports;
create policy "Anyone can read reports"
  on public.reports for select
  to anon, authenticated
  using (true);

drop policy if exists "Signed-in devices add their own reports" on public.reports;
create policy "Signed-in devices add their own reports"
  on public.reports for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Devices edit their own reports" on public.reports;
create policy "Devices edit their own reports"
  on public.reports for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Devices delete their own reports" on public.reports;
create policy "Devices delete their own reports"
  on public.reports for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Column-level access ----------
-- Explicit, since new tables aren't exposed to the Data API automatically.
revoke all on public.reports from anon, authenticated;
grant select (id, show_slug, method, got_ticket, price_paid, standing_room_available, shared_by, created_at)
  on public.reports to anon, authenticated;
grant insert (show_slug, method, got_ticket, price_paid, standing_room_available, shared_by)
  on public.reports to authenticated;
grant update (price_paid, standing_room_available)
  on public.reports to authenticated;
grant delete on public.reports to authenticated;

-- ---------- Rate limit: 10 reports per device per hour ----------
-- security definer so it can count by user_id, which visitors can't read.
create or replace function public.reports_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.reports
    where user_id = new.user_id
      and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Too many reports from this device. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.reports_rate_limit() from public, anon, authenticated;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.reports_rate_limit();

-- Make the Data API pick up the new table and grants right away.
notify pgrst, 'reload schema';
