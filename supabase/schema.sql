-- =====================================================================
--  বদরকণ্ঠ তারুণ্য মঞ্চ — রক্তদাতা তালিকা: ডাটাবেস সেটআপ
--  Supabase → SQL Editor → New query → পুরোটা পেস্ট করে "Run" চাপুন।
--  (আবার চালালেও সমস্যা নেই)
-- =====================================================================

-- ---------- ১. ব্যবহারকারীর ভূমিকা (donor / moderator / developer) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'donor' check (role in ('donor', 'moderator', 'developer')),
  created_at timestamptz not null default now()
);

-- বর্তমান ব্যবহারকারীর ভূমিকা (লগইন না থাকলে 'anon')
create or replace function public.app_role()
returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

-- নতুন অ্যাকাউন্ট খুললে স্বয়ংক্রিয়ভাবে profile তৈরি (ভূমিকা সবসময় 'donor')
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- যারা এই স্ক্রিপ্টের আগেই অ্যাকাউন্ট খুলেছেন তাদের জন্য
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ---------- ২. সাইটের সেটিংস ----------
create table if not exists public.site_settings (
  key   text primary key,
  value text not null default ''
);

insert into public.site_settings (key, value) values ('auto_approve', 'false')
on conflict (key) do nothing;

-- ---------- ৩. রক্তদাতা ----------
create table if not exists public.donors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete cascade,  -- মডারেটরের যোগ করা ডোনারের ক্ষেত্রে খালি
  name          text not null check (char_length(name) between 2 and 80),
  blood_group   text not null check (blood_group in ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  phone         text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  district      text not null check (char_length(district) between 2 and 40),
  area          text not null check (char_length(area) between 2 and 80),
  last_donation date,
  consent       boolean not null default false check (consent = true),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists donors_phone_uidx on public.donors (phone);
create index if not exists donors_search_idx on public.donors (status, blood_group, district);

-- সংরক্ষণের আগে নিয়ম প্রয়োগ: স্ট্যাটাস, মালিকানা, তারিখ
create or replace function public.donors_before_write()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r    text := public.app_role();
  auto boolean;
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.area := btrim(new.area);
  new.updated_at := now();

  if new.last_donation is not null and new.last_donation > (now() at time zone 'Asia/Dhaka')::date then
    raise exception 'শেষ রক্তদানের তারিখ ভবিষ্যতের হতে পারে না';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if r in ('moderator', 'developer') then
      new.status := 'approved';
    else
      select (value = 'true') into auto from public.site_settings where key = 'auto_approve';
      new.status  := case when coalesce(auto, false) then 'approved' else 'pending' end;
      new.user_id := auth.uid();
    end if;
  else
    -- সাধারণ ডোনার নিজের স্ট্যাটাস বা মালিকানা বদলাতে পারবে না
    if r not in ('moderator', 'developer') then
      new.status     := old.status;
      new.user_id    := old.user_id;
      new.created_by := old.created_by;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists donors_before_write on public.donors;
create trigger donors_before_write
  before insert or update on public.donors
  for each row execute function public.donors_before_write();

-- হোমপেজের গণনা (ব্লাড গ্রুপ অনুযায়ী অনুমোদিত ডোনার)
create or replace function public.donor_stats()
returns table (blood_group text, total bigint)
language sql stable security definer set search_path = public as $$
  select d.blood_group, count(*) from public.donors d where d.status = 'approved' group by d.blood_group;
$$;

-- ---------- ৪. ডোনেশন নম্বর (বিকাশ / নগদ / রকেট) ----------
create table if not exists public.payment_methods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         text not null default 'other' check (kind in ('bkash', 'nagad', 'rocket', 'bank', 'other')),
  number       text not null,
  account_type text not null default '',
  sort_order   int  not null default 0,
  active       boolean not null default true
);

-- নমুনা নম্বর (সাইটে ঢুকে ডেভেলপার প্যানেল থেকে আসল নম্বর বসাবেন)
insert into public.payment_methods (name, kind, number, account_type, sort_order)
select * from (values
  ('বিকাশ', 'bkash',  '01XXXXXXXXX', 'পার্সোনাল', 1),
  ('নগদ',   'nagad',  '01XXXXXXXXX', 'পার্সোনাল', 2),
  ('রকেট',  'rocket', '01XXXXXXXXX', 'পার্সোনাল', 3)
) as v (name, kind, number, account_type, sort_order)
where not exists (select 1 from public.payment_methods);

-- ---------- ৫. নিরাপত্তা (Row Level Security) ----------
alter table public.profiles        enable row level security;
alter table public.site_settings   enable row level security;
alter table public.donors          enable row level security;
alter table public.payment_methods enable row level security;

-- profiles: নিজের টা দেখা যাবে; ডেভেলপার সবার দেখবে ও ভূমিকা বদলাবে
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.app_role() = 'developer');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (public.app_role() = 'developer') with check (public.app_role() = 'developer');

-- site_settings: সবাই পড়বে, শুধু ডেভেলপার বদলাবে
drop policy if exists settings_select on public.site_settings;
create policy settings_select on public.site_settings for select using (true);

drop policy if exists settings_write on public.site_settings;
create policy settings_write on public.site_settings for all
  using (public.app_role() = 'developer') with check (public.app_role() = 'developer');

-- payment_methods: সবাই (সক্রিয়গুলো) দেখবে, শুধু ডেভেলপার বদলাবে
drop policy if exists payments_select on public.payment_methods;
create policy payments_select on public.payment_methods for select
  using (active = true or public.app_role() = 'developer');

drop policy if exists payments_write on public.payment_methods;
create policy payments_write on public.payment_methods for all
  using (public.app_role() = 'developer') with check (public.app_role() = 'developer');

-- donors
drop policy if exists donors_select on public.donors;
create policy donors_select on public.donors for select
  using (status = 'approved' or user_id = auth.uid() or public.app_role() in ('moderator', 'developer'));

drop policy if exists donors_insert on public.donors;
create policy donors_insert on public.donors for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or public.app_role() in ('moderator', 'developer')
  );

drop policy if exists donors_update on public.donors;
create policy donors_update on public.donors for update
  using (user_id = auth.uid() or public.app_role() in ('moderator', 'developer'))
  with check (user_id = auth.uid() or public.app_role() in ('moderator', 'developer'));

drop policy if exists donors_delete on public.donors;
create policy donors_delete on public.donors for delete
  using (user_id = auth.uid() or public.app_role() in ('moderator', 'developer'));

grant execute on function public.donor_stats() to anon, authenticated;
grant execute on function public.app_role() to anon, authenticated;

-- =====================================================================
--  শেষ ধাপ (আলাদাভাবে, নিজের ইমেইল দিয়ে একবার চালান):
--  প্রথমে সাইটে গিয়ে "লগইন → নতুন অ্যাকাউন্ট" থেকে অ্যাকাউন্ট খুলুন, তারপর:
--
--  update public.profiles set role = 'developer' where email = 'আপনার@ইমেইল.com';
-- =====================================================================
