-- ══════════════════════════════════════════════════════════════
-- Back2Build Demo — Complete Database Setup
-- Paste this entire file into Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. PROFILES ──────────────────────────────────────────────
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text not null,
  role       text not null check (role in ('property_owner', 'constructor')),
  city       text default '',
  phone      text default '',
  created_at timestamp with time zone default now()
);

-- ── 2. WALLETS ───────────────────────────────────────────────
create table public.wallets (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade unique not null,
  balance    numeric default 0 not null,
  updated_at timestamp with time zone default now()
);

-- ── 3. PROJECTS ──────────────────────────────────────────────
create table public.projects (
  id                      uuid default gen_random_uuid() primary key,
  project_code            text unique not null,
  owner_id                uuid references auth.users not null,
  title                   text not null,
  description             text default '',
  service                 text not null,
  city                    text not null,
  budget                  numeric not null,
  duration                text not null,
  project_type            text default 'direct' check (project_type in ('direct', 'bidding')),
  status                  text default 'pending' check (status in ('pending', 'ongoing', 'completed', 'cancelled')),
  assigned_constructor_id uuid references auth.users,
  created_at              timestamp with time zone default now()
);

-- ── 4. PROJECT APPLICATIONS ──────────────────────────────────
create table public.project_applications (
  id             uuid default gen_random_uuid() primary key,
  project_id     uuid references public.projects on delete cascade not null,
  constructor_id uuid references auth.users not null,
  message        text default '',
  status         text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at     timestamp with time zone default now(),
  unique(project_id, constructor_id)
);

-- ── 5. PROJECT ESCROWS ───────────────────────────────────────
create table public.project_escrows (
  id                     uuid default gen_random_uuid() primary key,
  escrow_code            text unique not null,
  project_id             uuid references public.projects on delete cascade unique not null,
  owner_id               uuid references auth.users not null,
  constructor_id         uuid references auth.users not null,
  total_amount           numeric not null,
  deposited_amount       numeric default 0,
  released_amount        numeric default 0,
  remaining_balance      numeric default 0,
  platform_fee_collected numeric default 0,
  status                 text default 'active' check (status in ('active', 'completed', 'refunded')),
  created_at             timestamp with time zone default now()
);

-- ── 6. WALLET TRANSACTIONS ───────────────────────────────────
create table public.wallet_transactions (
  id               uuid default gen_random_uuid() primary key,
  transaction_code text unique not null,
  user_id          uuid references auth.users not null,
  project_id       uuid references public.projects,
  escrow_id        uuid references public.project_escrows,
  amount           numeric not null,
  transaction_type text not null check (transaction_type in (
                     'wallet_topup', 'move_to_escrow', 'payment_release', 'platform_fee', 'refund'
                   )),
  from_entity      text not null,
  to_entity        text not null,
  description      text default '',
  created_at       timestamp with time zone default now()
);

-- ── 7. PROGRESS UPDATES ──────────────────────────────────────
create table public.progress_updates (
  id                       uuid default gen_random_uuid() primary key,
  project_id               uuid references public.projects not null,
  constructor_id           uuid references auth.users not null,
  title                    text not null,
  description              text not null,
  requested_release_amount numeric default 0,
  status                   text default 'submitted' check (status in ('submitted', 'approved', 'changes_requested')),
  created_at               timestamp with time zone default now()
);

-- ── 8. CONVERSATIONS ─────────────────────────────────────────
create table public.conversations (
  id             uuid default gen_random_uuid() primary key,
  project_id     uuid references public.projects not null,
  owner_id       uuid references auth.users not null,
  constructor_id uuid references auth.users not null,
  created_at     timestamp with time zone default now(),
  unique(project_id, owner_id, constructor_id)
);

-- ── 9. MESSAGES ──────────────────────────────────────────────
create table public.messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_id       uuid references auth.users not null,
  body            text not null,
  created_at      timestamp with time zone default now()
);

-- ── 10. AI MESSAGES ──────────────────────────────────────────
create table public.ai_messages (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamp with time zone default now()
);

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: Give every new user LKR 100,000 demo wallet balance
-- ══════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.wallets (user_id, balance)
  values (new.id, 100000);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════════════════════════
-- ENABLE REALTIME for live message updates
-- ══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.progress_updates;

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — users only see their own data
-- ══════════════════════════════════════════════════════════════
alter table public.profiles              enable row level security;
alter table public.wallets               enable row level security;
alter table public.projects              enable row level security;
alter table public.project_applications  enable row level security;
alter table public.project_escrows       enable row level security;
alter table public.wallet_transactions   enable row level security;
alter table public.progress_updates      enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.ai_messages           enable row level security;

-- Profiles
create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Wallets: own only
create policy "wallets_own" on public.wallets for all using (auth.uid() = user_id);

-- Projects: owners manage theirs, constructors see pending + assigned
create policy "projects_owner"            on public.projects for all using (auth.uid() = owner_id);
create policy "projects_constructor_read" on public.projects for select using (
  status = 'pending' or auth.uid() = assigned_constructor_id
);

-- Applications
create policy "applications_constructor"    on public.project_applications for all using (auth.uid() = constructor_id);
create policy "applications_owner_read"     on public.project_applications for select
  using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));
create policy "applications_owner_update"   on public.project_applications for update
  using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

-- Escrows
create policy "escrows_parties" on public.project_escrows for select
  using (auth.uid() = owner_id or auth.uid() = constructor_id);
create policy "escrows_insert"  on public.project_escrows for insert with check (auth.uid() = owner_id);
create policy "escrows_update"  on public.project_escrows for update using (auth.uid() = owner_id);

-- Transactions
create policy "transactions_own" on public.wallet_transactions for all using (auth.uid() = user_id);

-- Progress updates
create policy "progress_insert" on public.progress_updates for insert
  with check (auth.uid() = constructor_id);
create policy "progress_read"   on public.progress_updates for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id
    and (p.owner_id = auth.uid() or p.assigned_constructor_id = auth.uid())
  ));
create policy "progress_update" on public.progress_updates for update
  using (exists (select 1 from public.projects where id = project_id and owner_id = auth.uid()));

-- Conversations and messages
create policy "conversations_parties" on public.conversations for all
  using (auth.uid() = owner_id or auth.uid() = constructor_id);
create policy "messages_parties" on public.messages for all
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
    and (c.owner_id = auth.uid() or c.constructor_id = auth.uid())
  ));

-- AI messages
create policy "ai_messages_own" on public.ai_messages for all using (auth.uid() = user_id);
