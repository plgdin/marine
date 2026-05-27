import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('The Service Role Key is required to bypass RLS and create admin users.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL = 'admin@marinetrack.com';
const PASSWORD = 'password123';

async function setup() {
  console.log('🚀 Setting up Production-Ready Dev User...');

  // 1. Get or create the Organization
  let { data: orgs, error: orgErr } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('slug', 'ais-ingestion-org');

  if (orgErr) {
    console.error('❌ Failed to find org:', orgErr.message);
    process.exit(1);
  }

  let orgId = orgs?.[0]?.id;

  if (!orgId) {
    const { data: newOrg, error: newOrgErr } = await supabaseAdmin
      .from('organizations')
      .insert([{ name: 'AIS Ingestion Org', slug: 'ais-ingestion-org' }])
      .select('id')
      .single();
    
    if (newOrgErr || !newOrg) {
      console.error('❌ Failed to create org:', newOrgErr?.message);
      process.exit(1);
    }
    orgId = newOrg.id;
  }
  
  console.log(`✅ Organization ready (ID: ${orgId})`);

  // 2. Create or find the user
  let userId: string;
  const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listErr) {
    console.error('❌ Failed to list users:', listErr.message);
    process.exit(1);
  }

  const existingUser = userList?.users.find((u: any) => u.email === EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✅ User ${EMAIL} already exists (ID: ${userId})`);
  } else {
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'System Admin' }
    });

    if (createErr || !newUser?.user) {
      console.error('❌ Failed to create user:', createErr?.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`✅ Created user ${EMAIL}`);
  }

  // 3. Link user to organization in public.org_members
  const { error: memberErr } = await supabaseAdmin
    .from('org_members')
    .upsert({ org_id: orgId, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' });
    
  if (memberErr && !memberErr.message.includes('unique constraint')) {
    console.error('❌ Failed to add to org_members:', memberErr.message);
  } else {
    console.log('✅ Added user to org_members');
  }

  // 4. Update the JWT app_metadata (This is what the RLS policies check!)
  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      org_id: orgId,
      role: 'admin'
    }
  });

  if (updateErr) {
    console.error('❌ Failed to update app_metadata:', updateErr.message);
    process.exit(1);
  }

  console.log('✅ Injected org_id into JWT app_metadata for RLS access!');
  
  console.log('\n🎉 Setup Complete!');
  console.log('===================================================');
  console.log(`You can now log in to the frontend 'Production Way':`);
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log('===================================================');
}

setup();
