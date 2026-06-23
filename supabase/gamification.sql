-- Run in Supabase SQL Editor

alter table public.profiles add column if not exists xp integer default 0;
alter table public.profiles add column if not exists consecutive_misses integer default 0;
alter table public.profiles add column if not exists is_banned boolean default false;
alter table public.profiles add column if not exists banned_until_game_id uuid references public.games(id);
alter table public.profiles add column if not exists is_admin boolean default false;

-- To make yourself admin, run:
-- update public.profiles set is_admin = true where id = 'your-user-uuid';
