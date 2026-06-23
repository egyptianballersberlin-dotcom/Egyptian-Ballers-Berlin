-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Games (each Saturday)
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  game_date date not null unique,
  max_players integer default 24,
  status text default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  location text default 'TBD',
  created_at timestamptz default now()
);

-- Registrations
create table public.registrations (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  list_type text not null check (list_type in ('main', 'waiting')),
  position integer not null,
  registered_at timestamptz default now(),
  deregistered_at timestamptz,
  is_active boolean default true
);

-- Prevent a player from being registered twice on the same game (only among active registrations)
create unique index registrations_active_unique on public.registrations(game_id, user_id) where is_active = true;

-- Attendance
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  checked_in boolean default false,
  checked_in_at timestamptz,
  unique(game_id, user_id)
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.registrations enable row level security;
alter table public.attendance enable row level security;

-- Profiles: anyone can read, only own user can write
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Games: anyone can read, only service role can write
create policy "Games are viewable by everyone" on public.games for select using (true);

-- Registrations: anyone can read, users can manage their own
create policy "Registrations are viewable by everyone" on public.registrations for select using (true);
create policy "Users can insert their own registrations" on public.registrations for insert with check (auth.uid() = user_id);
create policy "Users can update their own registrations" on public.registrations for update using (auth.uid() = user_id);

-- Attendance: anyone can read, users can manage their own
create policy "Attendance is viewable by everyone" on public.attendance for select using (true);
create policy "Users can manage their own attendance" on public.attendance for insert with check (auth.uid() = user_id);
create policy "Users can update their own attendance" on public.attendance for update using (auth.uid() = user_id);

-- Function to auto-create game for next Saturday if none exists
create or replace function get_or_create_next_saturday()
returns uuid as $$
declare
  next_sat date;
  game_id uuid;
begin
  -- Find next Saturday
  next_sat := current_date + ((6 - extract(dow from current_date)::integer + 7) % 7) * interval '1 day';
  if extract(dow from current_date) = 6 then
    next_sat := current_date;
  end if;

  -- Get or create game for that date
  select id into game_id from public.games where game_date = next_sat;
  if not found then
    insert into public.games (game_date) values (next_sat) returning id into game_id;
  end if;
  return game_id;
end;
$$ language plpgsql security definer;
