# MarineTrack Integration & Connection Checklist

You are totally right: right now, the platform is an **incredibly advanced "shell"**. We have built the enterprise architecture, the WebGL map, the state management, the UI foundation, and the database schema—but it's currently running on "mock" data and stubs. 

To turn this into a fully connected, live platform, here are the exact manual steps you need to take.

---

## Phase 1: Set up Supabase (The Database & Auth)

Supabase handles all your users, security, and database storage.

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com/) and create a free project.
   - Wait a few minutes for the database to spin up.

2. **Get your Environment Variables**
   - In your Supabase dashboard, go to **Project Settings > API**.
   - Copy the `Project URL` and `anon public` key.
   - Create a file named `.env.local` in the root of your `Marine` folder on your computer and add them:
     ```env
     VITE_SUPABASE_URL=your_project_url_here
     VITE_SUPABASE_ANON_KEY=your_anon_key_here
     ```

3. **Deploy the Database Schema**
   - In your Supabase dashboard, go to the **SQL Editor**.
   - You need to run the three SQL migrations we generated. Copy and paste the contents of these files (in this order) and click Run:
     1. `supabase/migrations/20260521000000_core_schema.sql`
     2. `supabase/migrations/20260521000001_rls_policies.sql`
     3. `supabase/migrations/20260521000002_functions_triggers.sql`

4. **Enable Realtime Broadcasts**
   - In the Supabase dashboard, go to **Database > Replication**.
   - Click `0 Tables`, select the `vessel_positions` table, and enable replication for it. This allows the database to stream updates to the frontend via WebSockets.

---

## Phase 2: Set up Mapbox (The WebGL Map)

Mapbox provides the satellite imagery and vector tiles for the realtime map.

1. **Get a Mapbox Token**
   - Go to [mapbox.com](https://www.mapbox.com/) and create a free account.
   - Go to your account dashboard and copy your **Default public token** (it starts with `pk.`).

2. **Add it to your Environment**
   - Open your `.env.local` file again and add the token:
     ```env
     VITE_MAPBOX_TOKEN=pk.your_token_here
     ```

---

## Phase 3: Connect the Code to the Real APIs

Once you have your accounts set up, we need to remove the "Mock Data" from the code and wire it up to Supabase. **(I can do this for you whenever you are ready!)**

1. **Wire up Authentication**
   - Open `src/features/auth/components/AuthProvider.tsx`.
   - Delete the "STUB MODE" block that forces the app to log you in as `admin@marinetrack.app`.
   - Uncomment the real `supabaseClient.auth.getSession()` block so the app talks to Supabase to verify who is logging in.

2. **Wire up the Realtime Map**
   - Open `src/shared/services/realtime.service.ts`.
   - Delete the `startMockStream()` function that generates 500 fake vessels spinning in circles.
   - Uncomment the Supabase Channel code so it listens to the `public:vessel_positions` database table instead.

---

## Phase 4: Feeding Live Data (AIS Ingestion)

The app will now be listening to your Supabase database for vessel updates. However, your database is empty. 

To actually see real boats moving, you need to write data to the `vessel_positions` table.
- **The easy way for testing**: We can create a simple script that writes dummy data into your Supabase database every few seconds.
- **The production way**: You will eventually connect an external AIS provider (like Spire, MarineTraffic, or a Kafka stream) to push raw satellite/terrestrial AIS data into your Supabase database using an API token. 

---

### How to proceed?

If you want to keep building out the UI (like adding settings pages, fleet management tables, etc.), we can keep using the **Mock Mode**. 

If you want to start connecting the real backend, go grab your **Supabase Keys** and **Mapbox Token**, put them in a `.env.local` file, and tell me: *"I have my keys ready, wire up the real authentication and database connections!"*
