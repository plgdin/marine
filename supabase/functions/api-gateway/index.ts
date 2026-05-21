import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Initialize Supabase Admin Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Token should be Bearer <token_hash>
    // In production, validate this against the `api_tokens` table.
    const token = authHeader.replace('Bearer ', '')

    const { data: apiToken, error } = await supabaseClient
      .from('api_tokens')
      .select('org_id, scopes')
      .eq('token_hash', token)
      .single()

    if (error || !apiToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API Token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // TODO: Route request based on path, querying data specifically for `apiToken.org_id`
    
    return new Response(JSON.stringify({ 
      message: 'Gateway Authenticated',
      org_id: apiToken.org_id,
      scopes: apiToken.scopes
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
