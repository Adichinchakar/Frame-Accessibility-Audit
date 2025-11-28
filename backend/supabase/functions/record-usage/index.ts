// Usage Tracking API for A11y Audit Pro
// Deploy: supabase functions deploy record-usage

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FREE_LIMIT = 10

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { figmaUserId, email } = await req.json()
    
    if (!figmaUserId) {
      return new Response(JSON.stringify({ error: 'figmaUserId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single()
    
    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ figma_user_id: figmaUserId, email })
        .select('id')
        .single()
      user = newUser
    }
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Could not create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Check user's plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Check team membership
    const { data: teamMember } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (
          subscriptions (plan, status)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
    
    // Determine plan
    let plan = 'free'
    if (teamMember && teamMember.teams?.subscriptions?.status === 'active') {
      plan = 'team'
    } else if (subscription) {
      plan = subscription.plan
    }
    
    // If paid plan, allow unlimited
    if (plan !== 'free') {
      // Still record usage for analytics
      const monthYear = new Date().toISOString().slice(0, 7)
      await supabase.from('usage').upsert({
        user_id: user.id,
        month_year: monthYear,
        analyses_count: 1,
        last_analysis_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,month_year'
      })
      
      // Increment count
      await supabase.rpc('increment_usage', {
        p_user_id: user.id,
        p_month_year: monthYear
      }).catch(() => {
        // If RPC doesn't exist, do manual update
        supabase.from('usage')
          .update({ 
            analyses_count: supabase.sql`analyses_count + 1`,
            last_analysis_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('month_year', monthYear)
      })
      
      return new Response(JSON.stringify({
        allowed: true,
        remaining: -1, // -1 means unlimited
        plan
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Free plan - check limit
    const monthYear = new Date().toISOString().slice(0, 7)
    
    // Get current usage
    let { data: usage } = await supabase
      .from('usage')
      .select('analyses_count')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single()
    
    const currentCount = usage?.analyses_count || 0
    
    // Check if limit reached
    if (currentCount >= FREE_LIMIT) {
      return new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        plan: 'free',
        message: `Free limit of ${FREE_LIMIT} analyses per month reached. Upgrade to Pro for unlimited analyses.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Record usage
    if (usage) {
      await supabase
        .from('usage')
        .update({ 
          analyses_count: currentCount + 1,
          last_analysis_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
    } else {
      await supabase.from('usage').insert({
        user_id: user.id,
        month_year: monthYear,
        analyses_count: 1,
        last_analysis_at: new Date().toISOString()
      })
    }
    
    return new Response(JSON.stringify({
      allowed: true,
      remaining: FREE_LIMIT - (currentCount + 1),
      plan: 'free'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Usage tracking error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
