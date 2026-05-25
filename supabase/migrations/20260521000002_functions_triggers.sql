-- ==========================================
-- MARINE TRACK: Functions & Triggers
-- ==========================================

-- ── 1. Updated At Trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_vessels_updated_at
    BEFORE UPDATE ON vessels
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 2. Custom Claims JWT Auth Hook ──────────────────────
-- In Supabase, you can set up a "Custom Access Token (JWT) Hook"
-- to automatically enrich the JWT with roles and org_id.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_role public.org_role;
    user_org_id uuid;
BEGIN
    -- Fetch the user's primary organization and role
    SELECT org_id, role INTO user_org_id, user_role
    FROM public.org_members
    WHERE user_id = (event->>'user_id')::uuid
    LIMIT 1;

    claims := event->'claims';

    IF user_org_id IS NOT NULL THEN
        -- Inject into app_metadata which is trusted by our RLS functions
        claims := jsonb_set(claims, '{app_metadata, org_id}', to_jsonb(user_org_id));
        claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
    END IF;

    -- Update the event object with the new claims
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
END;
$$;

-- Note: The admin must grant execution rights to supabase_auth_admin
-- GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
-- And configure the hook in the Supabase Dashboard -> Authentication -> Hooks.

-- ── 3. Audit Logging (Basic) ────────────────────────────
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a full enterprise implementation, a trigger is placed on
-- vessels, geofences, and orgs to auto-insert into audit_logs.
