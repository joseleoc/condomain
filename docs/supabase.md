Developing with Supabase locally is called a **Local-First Workflow**. It turns your computer into an offline sandbox where you can build, break, and test your database securely using Docker containers. Once your features work perfectly, you use the Supabase CLI to deploy those changes safely to your production cloud database.

Here is the complete, visual step-by-step lifecycle of local development and deployment.

---

## The Workflow Overview

Instead of modifying your database live on the internet, your computer acts as the staging area. You write your table structures in migration files, test them locally, and push those files to the cloud when ready.

---

## Phase 1: Setting Up Your Local Sandbox

### Prerequisites

You must download and run **Docker Desktop** on your machine. The Supabase CLI uses Docker to run isolated containers on your system that mirror the real cloud environment (PostgreSQL, GoTrue Auth, Storage, etc.).

### Step 1: Install the CLI

Open your terminal, navigate to your root frontend project folder (e.g., your Expo or Next.js app), and add the Supabase CLI as a dev dependency:

```bash
npm install supabase --save-dev

```

### Step 2: Initialize the Architecture

Run the initialization tool to generate the configuration scaffolding:

```bash
pnpx supabase init

```

> **What this does:** It creates a new `supabase/` directory in your project root. Inside, you will find `config.toml` (local settings configuration), a `seed.sql` file (for dummy development data), and an empty `migrations/` folder.

### Step 3: Boot Up the Stack

Ensure Docker is running in the background, then spin up your local offline servers:

```bash
pnpx supabase start

```

_If this is your first time running this command, grab a coffee. Docker needs a few minutes to fetch the latest official repository container images._

Once finished, your terminal will display a summary block containing local API keys and URLs. Open the **Studio URL** (`http://127.0.0.1:54323`) in your web browser. This is an offline, completely functional clone of the Supabase dashboard interface.

---

## Phase 2: Writing Database Changes in Code

Now that your local machine is hosting your staging database, you can start building tables. Instead of clicking around the web dashboard, you will define everything via **SQL Migrations**.

### Step 4: Generate a New Migration File

Run this command to create a new code-controlled timestamped ledger for your table blueprints:

```bash
pnpx supabase migration new create_profiles_and_posts

```

Look inside your code editor under `supabase/migrations/`. You will see a new blank file named `<timestamp>_create_profiles_and_posts.sql`.

### Step 5: Write the Database Schema Code

Open that SQL file and write the standard PostgreSQL commands to construct your database schema layout:

```sql
-- 1. Create a public profiles table linked to Supabase Auth
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  updated_at timestamptz default now()
);

-- 2. Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create a public read policy for frontend access
create policy "Allow public read access" on public.profiles
  for select using (true);

```

### Step 6: Apply the Changes Locally

To force your local Docker PostgreSQL container to read your migration files and apply those structural updates, run a database reset:

```bash
pnpx supabase migration up
 or
pnpx supabase db reset

```

If you refresh your local dashboard tab (`http://127.0.0.1:54323`), you will see your new tables built and fully configured. You can now safe-test frontend API queries using `supabase-js` targeting this local environment.

---

## Phase 3: Pushing Your Code to the Cloud

Once your local application logic performs flawlessly with your offline schema adjustments, you can sync your code repository with your live remote database.

### Step 7: Link Your Codebase to the Live Cloud

Find your **Project Reference ID** from your remote cloud Supabase dashboard URL (`https://supabase.com/dashboard/project/your-project-id`). Link your terminal workspace to it:

```bash
pnpx supabase link --project-ref your-project-id

```

_(The CLI will prompt you to enter the database root password you selected when creating the online project)._

### Step 8: Deploy the Migrations

Push your code-first schema modifications up to the production database:

```bash
pnpx supabase db push

```

### How Supabase handles the deployment safely:

Supabase maintains an internal ledger (`supabase_migrations.schema_migrations`) inside your cloud database to track every timestamped migration file that has been applied in the past.

When you execute `pnpx supabase db push`, the CLI compares your local `supabase/migrations/` files against that remote cloud tracking table. It calculates exactly which files are missing, and runs _only_ the new migration files on your live production server without duplicating or corrupting your existing datasets.
