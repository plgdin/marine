# MarineTrack Architecture Part 6: Supabase Backend

This document defines the complete Supabase backend architecture for the MarineTrack enterprise platform, focusing on scalable multi-tenancy, PostgreSQL database design, Row Level Security (RLS), and Edge Functions.

## 1. Complete Database Architecture
The database is built on PostgreSQL, leveraging the `public` schema for application data and Supabase's native `auth` schema for identities. We will use PostGIS extensions for spatial data (vessel locations, geofences, trajectories) to enable high-performance geospatial queries.

## 2. Multi-Tenant Organization Architecture
Data is strictly partitioned logically using an `org_id` foreign key on every tenant-owned table. 
- **Organizations Table**: Stores tenant metadata, billing plans, and quotas.
- **Strict Isolation**: No cross-tenant data sharing. The platform is designed so a single Supabase instance can host hundreds of enterprise organizations securely.

## 3. User & 4. RBAC Permissions Architecture
- **Supabase Auth**: Users authenticate via `auth.users`.
- **Org Memberships**: A junction table `org_members` maps `auth.uid()` to an `org_id` and assigns a role (`owner`, `admin`, `member`, `viewer`).
- **Custom JWT Claims**: To optimize RLS performance, an Auth Hook (or database trigger) will inject the user's `org_id` and `role` into their JWT `app_metadata`. This allows RLS policies to evaluate permissions in O(1) time without recursive sub-selects.

## 5. Fleet & 6. Vessel Architecture
- **Vessels**: Represents the static entity (MMSI, IMO, dimensions, vessel type). Bound to an `org_id`.
- **Fleets**: A logical grouping of vessels. A vessel can belong to multiple fleets via a junction table `fleet_vessels`.
- **Vessel Positions**: A high-frequency table tracking temporal locations. Contains `location` (PostGIS `geography(Point, 4326)`), speed, heading, and timestamp.

## 7. Voyage Architecture
- Tracks a vessel's journey from an origin port to a destination port.
- Links to the `vessels` table. Contains ETA, ATA, distance, and status (planned, active, completed).

## 8. Alerts & 9. Notification Architecture
- **Alert Rules**: User-defined configurations (e.g., "Speed > 20kts inside Geofence A").
- **Alert Events**: Fired when a rule is breached. Stored persistently for auditing and broadcasted via Supabase Realtime for instant UI notification.

## 10. Subscription & 12. Usage Quota Architecture
- **Subscriptions**: Tracks Stripe billing status mapped to an `org_id`.
- **Quotas**: JSONB field on the `organizations` table defining limits (e.g., max vessels, max API requests). Enforced via PostgreSQL check constraints or Edge Functions.

## 11. API Token Architecture
- **API Keys**: Stored in `api_tokens` (hashed securely). Used by external systems (or future integrations) to push/pull data on behalf of an organization.
- **Middleware**: API requests hit Supabase Edge Functions, which validate the Bearer token against the `api_tokens` table before executing internal queries.

## 13. Audit Logging Architecture
- **Audit Logs**: An append-only table recording sensitive actions (login, geofence creation, role changes, alert acknowledgments).
- **Trigger-Based**: PostgreSQL triggers automatically record changes to critical tables.

## 14. Realtime Table Strategy
- **`vessel_positions`**: High-frequency broadcast. Only `INSERT` and `UPDATE` events are published.
- **`alert_events`**: Broadcast to trigger UI toasts and update badge counts.
- **Optimization**: Realtime filters will use the JWT's `org_id` claim to ensure organizations only receive streams for their own data.

## 15. Event-Driven Backend Architecture
- **Database Webhooks**: PostgreSQL triggers send asynchronous HTTP requests to Supabase Edge Functions when complex business logic is required (e.g., Voyage completion triggering an analytics aggregation).

## 16. Security Architecture & 19. RLS Strategy
- **Default Deny**: All tables will have `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`.
- **Policies**: 
  - Read: `auth.jwt() -> 'app_metadata' ->> 'org_id' = org_id::text`
  - Write: Restricted by role (e.g., only `admin` can mutate `geofences`).

## 17. JWT Architecture
We will utilize Supabase's `auth.users` combined with custom claims:
```json
{
  "app_metadata": {
    "org_id": "uuid",
    "role": "admin"
  }
}
```

## 18. Supabase Edge Functions Architecture
Deno-based serverless functions for tasks that cannot be handled securely in the browser:
- `api-gateway`: Handles external API token validation and rate limiting.
- `billing-webhook`: Stripe integration.
- `alert-evaluator`: Consumes incoming AIS positions (via Kafka/Redis bridge eventually) and evaluates spatial geofence intersections using PostGIS.

## 20. Future AIS Ingestion Readiness
- The `vessel_positions` table will be designed with partitioning in mind (e.g., time-scale DB extension or native PostgreSQL partitioning by month) to handle billions of rows when raw AIS streams are ingested.

---

## Supabase Folder Structure

```text
supabase/
  migrations/
    20260521000000_initial_schema.sql     # Core tables
    20260521000001_rls_policies.sql       # Security rules
    20260521000002_triggers_functions.sql # Audit, JWT hooks
  functions/
    shared/                               # Shared Deno utils
    api-gateway/                          # External API handling
    webhook-stripe/                       # Billing
  seed.sql                                # Local dev dummy data
  config.toml                             # Local Supabase config
```
