/**
 * Applies the vessel_tiles performance fix migration directly to Supabase.
 * Run: node scratch/apply_fix.js
 */
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const sql1 = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260530000000_fix_vessel_tiles_performance.sql'),
  'utf8'
);

const sql2 = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260530000001_vessel_bbox_rpc.sql'),
  'utf8'
);

const combinedSql = sql1 + '\n\n' + sql2;

async function applyFix() {
  console.log('🔧 Applying database migrations...\n');

  // Execute the SQL via the Supabase SQL RPC (requires service_role or dashboard)
  // Since we only have anon key, we'll use the rpc endpoint
  const res = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: combinedSql }),
  });

  if (!res.ok) {
    console.log('⚠️  Cannot apply via anon key (expected). You need to run this SQL in Supabase Dashboard.');
    console.log('');
    console.log('📋 Go to: https://supabase.com/dashboard → SQL Editor → paste the contents of:');
    console.log('   supabase/migrations/20260530000000_fix_vessel_tiles_performance.sql');
    console.log('');
    console.log('Or run this single command if you have supabase CLI linked:');
    console.log('   npx supabase db push');
    console.log('');

    // Let's test the current state of the tile endpoint
    console.log('── Current tile endpoint status ──');
    try {
      const tileRes = await fetch(`${url}/rest/v1/rpc/vessel_tiles?z=3&x=4&y=3`, {
        headers: { 'apikey': key, 'Accept': 'application/vnd.pbf' },
        signal: AbortSignal.timeout(15000),
      });
      const buf = await tileRes.arrayBuffer();
      console.log(`  Status: ${tileRes.status}, Size: ${buf.byteLength} bytes`);
      if (tileRes.status === 300) console.log('  ❌ Multiple function overloads exist — need to drop the old one');
      else if (tileRes.status === 504) console.log('  ❌ Timeout — SECURITY INVOKER + RLS is too slow');
      else if (tileRes.status === 200 && buf.byteLength > 100) console.log('  ✅ Tiles are working!');
      else console.log('  ⚠️  Tiles returned but may be empty');
    } catch (e) {
      console.log('  ❌ Request failed:', e.message);
    }
  } else {
    console.log('✅ Migration applied successfully!');
  }
}

applyFix().catch(console.error);
