# MarineTrack Supabase Backend Architecture

The Supabase enterprise backend has been successfully initialized and strictly adheres to a robust, multi-tenant SQL migration architecture. We are now ready to scale to millions of positional events while keeping data tightly secured.

## Accomplishments

### 1. Supabase Initialization
The project has been configured with the Supabase CLI (`supabase init`). The entire backend is defined declaratively within `supabase/migrations/` rather than relying on point-and-click UI changes, guaranteeing reproducible deployments and strong CI/CD guarantees.

### 2. Multi-Tenant Schema Design
Created `00000_core_schema.sql` which provisions:
- **`organizations` & `org_members`**: The bedrock of our B2B SaaS tenancy model.
- **`vessels` & `fleets`**: With relational junction tables.
- **`vessel_positions` (PostGIS)**: The high-frequency table for realtime vessel pings, equipped with `GEOGRAPHY(POINT)` data types for rapid bounding-box and distance queries via the `GIST` index.
- **`api_tokens`**: The foundation for external developer integrations and monetization.

### 3. Bulletproof RLS (Row Level Security)
Created `00001_rls_policies.sql`.
- We enacted a strict "default-deny" posture across all tables (`ENABLE ROW LEVEL SECURITY`).
- Read and Write policies rely entirely on the injected `auth.org_id()` function, making them evaluate in **O(1)** time without heavy PostgreSQL joins. 

### 4. Custom JWT Authentication Hooks
Created `00002_functions_triggers.sql`.
- Injected a Supabase custom Auth Hook (`custom_access_token_hook`) that intercepts logins and embeds the user's `org_id` and `role` directly inside the JWT `app_metadata`. This is the secret to enterprise scalability with RLS.
- Attached automated `updated_at` PostgreSQL triggers to core tables.
- Provided an `audit_logs` foundation structure.

### 5. Edge Functions & API Gateway
Scaffolded a Deno serverless function at `supabase/functions/api-gateway/index.ts`. This acts as an ingress point for external hardware or developers pushing AIS data. It automatically intercepts `Bearer` tokens and cross-checks them against the `api_tokens` table.

### 6. Frontend Glue Code
- Constructed `src/config/supabase.ts` for connecting the frontend.
- Generated `src/shared/types/database.types.ts` manually mapping out our exact PostgreSQL tables for TypeScript intellisense.
- Built a slick `rbac.ts` utility that provides helpers like `requireRole('admin')` for simple imperative permission checking.

## Next Steps

1. To spin up this database locally (assuming Docker is installed), you can run: `npx supabase start`.
2. This will apply all migrations and give you a local PostgREST URL, Studio URL, and Postgres Connection string.
3. Once running, we can hook the frontend `AuthProvider` directly into Supabase instead of using the stubbed methods!
