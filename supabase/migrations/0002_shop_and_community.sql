-- Adds: 'shop' as a valid orders.type (product purchases, distinct from
-- 'spa' grooming bookings), and a lightweight Paw Community feed.
-- Additive only — does not touch existing tables/data from 0001_init.sql.

alter table orders drop constraint if exists orders_type_check;
alter table orders add constraint orders_type_check check (type in ('food', 'spa', 'shop'));

create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  pet_id uuid references pets(id) on delete set null,
  content text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table community_posts enable row level security;

drop policy if exists "community_posts: any authenticated read" on community_posts;
create policy "community_posts: any authenticated read" on community_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "community_posts: author writes" on community_posts;
create policy "community_posts: author writes" on community_posts
  for insert with check (
    author_id = auth.uid()
    and (pet_id is null or has_pet_access(pet_id))
  );

drop policy if exists "community_posts: author deletes own" on community_posts;
create policy "community_posts: author deletes own" on community_posts
  for delete using (author_id = auth.uid());
