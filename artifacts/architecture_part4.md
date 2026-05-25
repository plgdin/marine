# Part 4 — Folder Structure & Conventions

---

## 21. Complete Enterprise Folder Structure

```
marinetrack/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_create_schemas.sql
│   │   ├── 00002_extensions.sql
│   │   ├── 00003_org_tables.sql
│   │   ├── 00004_vessel_tables.sql
│   │   ├── 00005_fleet_tables.sql
│   │   ├── 00006_voyage_tables.sql
│   │   ├── 00007_alert_tables.sql
│   │   ├── 00008_notification_tables.sql
│   │   ├── 00009_billing_tables.sql
│   │   ├── 00010_rls_policies.sql
│   │   ├── 00011_functions.sql
│   │   ├── 00012_triggers.sql
│   │   ├── 00013_indexes.sql
│   │   ├── 00014_materialized_views.sql
│   │   └── 00015_seed_data.sql
│   ├── functions/
│   │   ├── ais-ingest/
│   │   │   └── index.ts
│   │   ├── vessel-search/
│   │   │   └── index.ts
│   │   ├── analytics-aggregate/
│   │   │   └── index.ts
│   │   ├── geofence-check/
│   │   │   └── index.ts
│   │   ├── alert-dispatch/
│   │   │   └── index.ts
│   │   ├── webhook-handler/
│   │   │   └── index.ts
│   │   ├── billing-sync/
│   │   │   └── index.ts
│   │   ├── api-key-validate/
│   │   │   └── index.ts
│   │   └── _shared/
│   │       ├── cors.ts
│   │       ├── auth.ts
│   │       ├── response.ts
│   │       ├── validation.ts
│   │       └── types.ts
│   ├── seed.sql
│   └── config.toml
│
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Root component
│   │   ├── Router.tsx                 # Route definitions
│   │   ├── Providers.tsx              # Provider composition
│   │   └── ErrorBoundary.tsx          # Global error boundary
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   ├── AuthGuard.tsx
│   │   │   │   └── SSOButton.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useSession.ts
│   │   │   │   └── usePermissions.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── stores/
│   │   │   │   └── auth.store.ts
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── SignupPage.tsx
│   │   │   │   └── InvitePage.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── FleetOverview.tsx
│   │   │   │   ├── RecentAlerts.tsx
│   │   │   │   ├── VesselStatusChart.tsx
│   │   │   │   └── ActivityFeed.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useDashboardStats.ts
│   │   │   ├── services/
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── map/
│   │   │   ├── components/
│   │   │   │   ├── MapContainer.tsx
│   │   │   │   ├── MapControls.tsx
│   │   │   │   ├── MapLayerManager.tsx
│   │   │   │   ├── VesselMarkerLayer.tsx
│   │   │   │   ├── VesselClusterLayer.tsx
│   │   │   │   ├── VesselTrackLayer.tsx
│   │   │   │   ├── GeofenceLayer.tsx
│   │   │   │   ├── GeofenceDrawer.tsx
│   │   │   │   ├── VoyageRouteLayer.tsx
│   │   │   │   ├── WeatherOverlay.tsx
│   │   │   │   ├── PortMarkerLayer.tsx
│   │   │   │   ├── VesselPopup.tsx
│   │   │   │   └── MiniMap.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMap.ts
│   │   │   │   ├── useMapViewport.ts
│   │   │   │   ├── useVesselLayer.ts
│   │   │   │   ├── useCluster.ts
│   │   │   │   ├── useGeofenceDraw.ts
│   │   │   │   └── useMapInteraction.ts
│   │   │   ├── utils/
│   │   │   │   ├── map.config.ts
│   │   │   │   ├── geo.helpers.ts
│   │   │   │   ├── vessel-icon.generator.ts
│   │   │   │   └── viewport.helpers.ts
│   │   │   ├── workers/
│   │   │   │   └── cluster.worker.ts
│   │   │   ├── stores/
│   │   │   │   └── map.store.ts
│   │   │   ├── pages/
│   │   │   │   └── MapPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── vessels/
│   │   │   ├── components/
│   │   │   │   ├── VesselCard.tsx
│   │   │   │   ├── VesselTable.tsx
│   │   │   │   ├── VesselFilters.tsx
│   │   │   │   ├── VesselDetail.tsx
│   │   │   │   ├── VesselSpecs.tsx
│   │   │   │   ├── VesselHistory.tsx
│   │   │   │   ├── VesselPhoto.tsx
│   │   │   │   └── VesselSearch.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useVessels.ts
│   │   │   │   ├── useVesselDetail.ts
│   │   │   │   ├── useVesselSearch.ts
│   │   │   │   └── useVesselPositions.ts
│   │   │   ├── services/
│   │   │   │   ├── vessel.service.ts
│   │   │   │   └── vessel.types.ts
│   │   │   ├── stores/
│   │   │   │   └── vessel.store.ts
│   │   │   ├── utils/
│   │   │   │   └── vessel.helpers.ts
│   │   │   ├── pages/
│   │   │   │   ├── VesselsPage.tsx
│   │   │   │   └── VesselDetailPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── fleets/
│   │   │   ├── components/
│   │   │   │   ├── FleetCard.tsx
│   │   │   │   ├── FleetList.tsx
│   │   │   │   ├── FleetForm.tsx
│   │   │   │   └── FleetVesselPicker.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useFleets.ts
│   │   │   │   └── useFleetDetail.ts
│   │   │   ├── services/
│   │   │   │   └── fleet.service.ts
│   │   │   ├── pages/
│   │   │   │   ├── FleetsPage.tsx
│   │   │   │   └── FleetDetailPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── voyages/
│   │   │   ├── components/
│   │   │   │   ├── VoyageCard.tsx
│   │   │   │   ├── VoyageTimeline.tsx
│   │   │   │   ├── VoyageForm.tsx
│   │   │   │   └── VoyageRoute.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useVoyages.ts
│   │   │   │   └── useVoyageDetail.ts
│   │   │   ├── services/
│   │   │   │   └── voyage.service.ts
│   │   │   ├── pages/
│   │   │   │   ├── VoyagesPage.tsx
│   │   │   │   └── VoyageDetailPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── alerts/
│   │   │   ├── components/
│   │   │   │   ├── AlertList.tsx
│   │   │   │   ├── AlertCard.tsx
│   │   │   │   ├── AlertRuleForm.tsx
│   │   │   │   ├── AlertBadge.tsx
│   │   │   │   └── AlertTimeline.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAlerts.ts
│   │   │   │   ├── useAlertRules.ts
│   │   │   │   └── useRealtimeAlerts.ts
│   │   │   ├── services/
│   │   │   │   └── alert.service.ts
│   │   │   ├── stores/
│   │   │   │   └── alert.store.ts
│   │   │   ├── pages/
│   │   │   │   └── AlertsPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── ChartDashboard.tsx
│   │   │   │   ├── KPICard.tsx
│   │   │   │   ├── VesselActivityChart.tsx
│   │   │   │   ├── FleetUtilization.tsx
│   │   │   │   ├── PortCallAnalysis.tsx
│   │   │   │   └── ReportBuilder.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAnalytics.ts
│   │   │   │   └── useReportBuilder.ts
│   │   │   ├── services/
│   │   │   │   └── analytics.service.ts
│   │   │   ├── pages/
│   │   │   │   ├── AnalyticsPage.tsx
│   │   │   │   └── ReportsPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── geofences/
│   │   │   ├── components/
│   │   │   │   ├── GeofenceList.tsx
│   │   │   │   ├── GeofenceCard.tsx
│   │   │   │   └── GeofenceForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useGeofences.ts
│   │   │   ├── services/
│   │   │   │   └── geofence.service.ts
│   │   │   ├── pages/
│   │   │   │   └── GeofencesPage.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── OrgSettings.tsx
│   │   │   │   ├── MemberList.tsx
│   │   │   │   ├── MemberInviteForm.tsx
│   │   │   │   ├── TeamManager.tsx
│   │   │   │   ├── ApiKeyManager.tsx
│   │   │   │   ├── BillingOverview.tsx
│   │   │   │   ├── PlanSelector.tsx
│   │   │   │   └── ProfileForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useOrgSettings.ts
│   │   │   │   ├── useMembers.ts
│   │   │   │   └── useBilling.ts
│   │   │   ├── services/
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── billing.service.ts
│   │   │   ├── pages/
│   │   │   │   ├── SettingsPage.tsx
│   │   │   │   ├── MembersPage.tsx
│   │   │   │   ├── BillingPage.tsx
│   │   │   │   ├── ApiKeysPage.tsx
│   │   │   │   └── ProfilePage.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── notifications/
│   │       ├── components/
│   │       │   ├── NotificationCenter.tsx
│   │       │   ├── NotificationItem.tsx
│   │       │   └── NotificationPreferences.tsx
│   │       ├── hooks/
│   │       │   └── useNotifications.ts
│   │       ├── services/
│   │       │   └── notification.service.ts
│   │       ├── stores/
│   │       │   └── notification.store.ts
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ui/                    # Primitive UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Drawer.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── index.ts
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── PageHeader.tsx
│   │   │   │   └── ContentArea.tsx
│   │   │   ├── feedback/
│   │   │   │   ├── ErrorFallback.tsx
│   │   │   │   ├── LoadingScreen.tsx
│   │   │   │   └── ConnectionStatus.tsx
│   │   │   └── data-display/
│   │   │       ├── DataTable.tsx
│   │   │       ├── StatCard.tsx
│   │   │       ├── Timeline.tsx
│   │   │       └── CommandPalette.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useMediaQuery.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── useClickOutside.ts
│   │   │   ├── useKeyboard.ts
│   │   │   └── useInfiniteScroll.ts
│   │   │
│   │   ├── services/
│   │   │   ├── supabase.client.ts     # Supabase client singleton
│   │   │   ├── api.client.ts          # Typed API wrapper
│   │   │   ├── realtime.service.ts    # Realtime subscription manager
│   │   │   └── storage.service.ts     # File upload/download
│   │   │
│   │   ├── stores/
│   │   │   ├── ui.store.ts
│   │   │   └── realtime.store.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts              # Date, number, coordinate formatting
│   │   │   ├── validation.ts          # Zod schemas
│   │   │   ├── constants.ts           # App-wide constants
│   │   │   ├── event-bus.ts           # Cross-feature event bus
│   │   │   ├── logger.ts              # Structured logging
│   │   │   └── error.ts              # Error classes and handlers
│   │   │
│   │   └── types/
│   │       ├── database.types.ts      # Auto-generated Supabase types
│   │       ├── api.types.ts           # API request/response types
│   │       ├── domain.types.ts        # Core domain models
│   │       ├── map.types.ts           # Map/geo types
│   │       └── common.types.ts        # Shared utility types
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── map.css                    # Mapbox overrides
│   │   └── animations.css             # Framer Motion presets
│   │
│   ├── assets/
│   │   ├── icons/
│   │   │   └── vessel-types/          # SVG vessel type icons
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── config/
│   │   ├── env.ts                     # Typed env var access
│   │   ├── routes.ts                  # Route path constants
│   │   ├── query-keys.ts             # TanStack Query key factories
│   │   └── permissions.ts             # RBAC permission definitions
│   │
│   ├── workers/
│   │   └── cluster.worker.ts          # Web Worker for clustering
│   │
│   ├── main.tsx                       # Entry point
│   └── vite-env.d.ts
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── stores/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── vessels.test.ts
│   │   └── realtime.test.ts
│   ├── e2e/
│   │   ├── login.spec.ts
│   │   ├── map.spec.ts
│   │   ├── vessels.spec.ts
│   │   └── alerts.spec.ts
│   └── setup.ts
│
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── onboarding/
│
├── scripts/
│   ├── generate-types.sh              # Supabase type generation
│   ├── seed-dev-data.ts
│   └── migrate.sh
│
├── .env.local
├── .env.staging
├── .env.production
├── .eslintrc.cjs
├── .prettierrc
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── package.json
└── README.md
```

---

## 22. Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| **Files — Components** | PascalCase | `VesselCard.tsx` |
| **Files — Hooks** | camelCase, `use` prefix | `useVessels.ts` |
| **Files — Services** | kebab-case with `.service` suffix | `vessel.service.ts` |
| **Files — Stores** | kebab-case with `.store` suffix | `map.store.ts` |
| **Files — Types** | kebab-case with `.types` suffix | `domain.types.ts` |
| **Files — Utils** | kebab-case with `.helpers` suffix | `geo.helpers.ts` |
| **Files — Tests** | match source + `.test` / `.spec` | `vessel.service.test.ts` |
| **Directories** | kebab-case | `data-display/` |
| **SQL Migrations** | numbered prefix + snake_case | `00004_vessel_tables.sql` |
| **Edge Functions** | kebab-case directory | `ais-ingest/` |
| **DB Tables** | snake_case, plural | `vessel.positions` |
| **DB Columns** | snake_case | `created_at` |
| **DB Functions** | snake_case | `auth.org_id()` |
| **TypeScript Interfaces** | PascalCase | `VesselPosition` |
| **TypeScript Enums** | PascalCase members | `VesselType.Cargo` |
| **Zustand Stores** | `use[Name]Store` | `useMapStore` |
| **Query Keys** | `[domain]Keys` object | `vesselKeys.list()` |
| **CSS** | Tailwind utilities + BEM for custom | `vessel-marker__icon--active` |

---

## 23. Module Boundary Rules

```
ALLOWED imports:
────────────────
feature → shared/*           ✅  (features use shared utilities)
feature → feature/index.ts   ✅  (via barrel export only)
shared → shared              ✅  (shared can use shared)
app → feature                ✅  (app composes features)
app → shared                 ✅  (app uses shared)

FORBIDDEN imports:
──────────────────
feature → feature (internal)  ❌  (no deep imports across features)
shared → feature              ❌  (shared must not know about features)
feature → app                 ❌  (features must not know about app shell)

Cross-feature communication:
────────────────────────────
Option 1: URL parameters (React Router searchParams)
Option 2: Shared Zustand stores (in shared/stores/)
Option 3: Event bus (shared/utils/event-bus.ts)
Option 4: TanStack Query cache (read from any feature)
```

---

## 24. Domain-Driven Design Recommendations

### Bounded Contexts

```
                    ┌─────────────┐
                    │   Vessel    │ ← Core Domain
                    │  Context    │   (highest business value)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴────┐ ┌────┴─────┐
        │   Fleet   │ │ Voyage │ │  Alert   │ ← Supporting Domains
        │  Context  │ │Context │ │ Context  │
        └───────────┘ └────────┘ └──────────┘
              │
        ┌─────┴──────────┬──────────────┐
        │                │              │
  ┌─────┴─────┐   ┌─────┴─────┐  ┌────┴──────┐
  │   Org     │   │ Analytics │  │ Billing  │ ← Generic Domains
  │  Context  │   │  Context  │  │ Context  │
  └───────────┘   └───────────┘  └──────────┘
```

### Aggregate Boundaries

| Aggregate Root | Owned Entities | Invariants |
|---------------|----------------|------------|
| `Organization` | Members, Teams, Invitations | Max members per plan; unique slugs |
| `Vessel` | Positions (recent), Metadata | Unique MMSI/IMO; valid coordinates |
| `Fleet` | FleetVessels | Vessel belongs to org; unique name per org |
| `Voyage` | Waypoints, Route | Single active voyage per vessel |
| `AlertRule` | — | Valid config per rule type |
| `Geofence` | — | Valid polygon geometry; unique name per org |

### Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Vessel** | A tracked maritime asset identified by MMSI/IMO |
| **Position** | A point-in-time location report for a vessel |
| **Fleet** | A logical grouping of vessels |
| **Voyage** | A planned or active journey from origin to destination |
| **Geofence** | A geographic polygon boundary for monitoring |
| **Alert Rule** | A condition definition that triggers alert events |
| **Alert Event** | A triggered instance of an alert rule violation |
| **Organization** | A tenant (company/team) in the multi-tenant system |
| **Member** | A user within an organization with a specific role |
| **Track** | An ordered series of positions forming a vessel's path |

---

## 25. Shared Services Strategy

```
shared/services/
├── supabase.client.ts     → Single Supabase client instance
│                            Used by ALL features for DB/Auth/Realtime
│
├── api.client.ts          → Typed wrapper around supabase client
│                            Adds error handling, logging, retry logic
│                            Features import typed methods, not raw supabase
│
├── realtime.service.ts    → Manages all Realtime channel subscriptions
│                            Handles reconnection, gap-fill, cleanup
│                            Features call subscribe/unsubscribe methods
│
└── storage.service.ts     → File upload/download abstraction
                             Used for vessel photos, documents, exports
```

**Key principle**: Features never import `@supabase/supabase-js` directly. They always go through `shared/services/` for consistency, logging, and future abstraction.
