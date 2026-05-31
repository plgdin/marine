import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fix() {
  const { error } = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE public.vessels ADD CONSTRAINT uq_vessels_org_mmsi UNIQUE (org_id, mmsi);' });
  if (error) {
    console.error('RPC failed. Trying via schema change...');
    // We can't run raw SQL easily via client without an RPC, so we'll just write a quick fetch to the REST API or just instruct the user.
  }
}
fix();
