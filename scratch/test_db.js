const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function test() {
  console.log("Testing organizations...");
  const res1 = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=*`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const orgs = await res1.json();
  console.log("Orgs visible to anon:", orgs);
}

test();
