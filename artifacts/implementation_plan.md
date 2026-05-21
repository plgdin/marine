# Supabase Backend Implementation Plan

This plan details the steps to implement the enterprise multi-tenant database schema and security foundations in Supabase, based on `architecture_part6_backend.md`.

## User Review Required

> [!WARNING]
> This plan generates raw SQL migrations and Supabase Edge Function templates. It requires the Supabase CLI to be installed and initialized in the project (`supabase init`) to fully test locally.
> Do you want me to automatically initialize the Supabase project folder (`supabase init`), or simply create the SQL migration files in a `supabase/migrations/` directory directly?

## Proposed Changes

### 1. Database Migrations (`supabase/migrations/`)
We will generate comprehensive SQL migrations to define the schema:

#### [NEW] `20260521000000_core_schema.sql`
- Create `organizations`, `org_members`, `api_tokens`.
- Create `vessels`, `fleets`, `fleet_vessels`, `vessel_positions`.
- Create `geofences`, `alert_rules`, `alert_events`.
- Enable PostGIS extension for spatial types.

#### [NEW] `20260521000001_rls_policies.sql`
- Enable Row Level Security (RLS) on all tables.
- Define `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies strictly scoped by `org_id` using JWT custom claims for maximum performance.

#### [NEW] `20260521000002_functions_triggers.sql`
- Create PostgreSQL trigger functions to automatically update `updated_at` columns.
- Create an Auth Hook function to inject `org_id` and `role` into the user's JWT upon sign-in.

### 2. Frontend Integration (`src/shared/services/`)
#### [MODIFY] `src/shared/services/api.client.ts`
- Update the client to gracefully handle Supabase JWT refresh tokens and attach them to Edge Function calls.

#### [NEW] `src/config/supabase.ts`
- Initialize the `@supabase/supabase-js` client for Auth and Realtime subscriptions, cleanly separating it from the UI layer.

### 3. Edge Functions (`supabase/functions/`)
#### [NEW] `supabase/functions/api-gateway/index.ts`
- A Deno-based starter Edge Function that validates custom API tokens from the `api_tokens` table before proxying internal data, demonstrating the enterprise monetization layer.

## Verification Plan

### Automated Tests
- The SQL scripts will be syntax-checked. If the Supabase CLI is available, we will run `supabase db start` and `supabase db reset` to verify the migrations compile successfully into a local Postgres instance.

### Manual Verification
- Review the generated SQL to ensure `org_id` is present on all tenant tables and RLS policies correctly isolate data.
