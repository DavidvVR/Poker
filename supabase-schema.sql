-- Supabase schema for Poker Amigos MVP

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid references profiles(id) on delete set null,
  status text not null default 'waiting',
  created_at timestamptz default now()
);

create table if not exists room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  seat integer not null,
  is_ready boolean default false,
  chips integer default 1000,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  current_turn uuid references profiles(id),
  dealer_position integer default 0,
  pot integer default 0,
  status text not null default 'waiting',
  created_at timestamptz default now()
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  hand jsonb,
  folded boolean default false,
  all_in boolean default false,
  chips integer default 1000,
  position integer,
  unique(game_id, user_id)
);

create table if not exists game_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  action text not null,
  amount integer default 0,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);
