// License Validation API for A11y Audit Pro
// Deploy: supabase functions deploy validate-license

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    
    // Get user by Figma ID
    let { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('figma_user_id', figmaUserId)
      .single()
    
    // If no user, return free plan
    if (!user) {
      return new Response(JSON.stringify({
        plan: 'free',
        status: 'active',
        analysesRemaining: 10,
        teamId: null,
        teamRole: null,
        features: {
          unlimitedAnalyses: false,
          history: false,
          allWcagVersions: false,
          oneClickFixes: false,
          teamFeatures: false,
          exportReports: false,
          prioritySupport: false
        },
        user: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Check for team membership (might override individual subscription)
    const { data: teamMember } = await supabase
      .from('team_members')
      .select(`
        *,
        teams (
          id,
          name,
          subscription_id,
          subscriptions (plan, status)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
    
    // Check team invitation by email
    let pendingInvitation = null
    if (email || user.email) {
      const { data: invitation } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (id, name)
        `)
        .eq('email', email || user.email)
        .eq('status', 'pending')
        .single()
      
      if (invitation) {
        pendingInvitation = {
          teamId: invitation.team_id,
          teamName: invitation.teams?.name,
          invitedAt: invitation.invited_at
        }
      }
    }
    
    // Determine plan and features
    let plan = 'free'
    let status = 'active'
    let teamId = null
    let teamRole = null
    let currentPeriodEnd = null
    
    // Team membership takes priority
    if (teamMember && teamMember.teams?.subscriptions?.status === 'active') {
      plan = 'team'
      teamId = teamMember.team_id
      teamRole = teamMember.role
    } else if (subscription) {
      plan = subscription.plan
      status = subscription.status
      currentPeriodEnd = subscription.current_period_end
    }
    
    // Check if subscription expired
    if (currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) {
      plan = 'free'
      status = 'expired'
    }
    
    // Get usage this month
    const monthYear = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data: usage } = await supabase
      .from('usage')
      .select('analyses_count')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .single()
    
    const analysesUsed = usage?.analyses_count || 0
    const analysesRemaining = plan === 'free' ? Math.max(0, 10 - analysesUsed) : -1 // -1 means unlimited
    
    // Feature flags based on plan
    const features = {
      unlimitedAnalyses: plan !== 'free',
      history: plan !== 'free',
      allWcagVersions: plan !== 'free',
      oneClickFixes: plan !== 'free',
      teamFeatures: plan === 'team',
      exportReports: plan !== 'free',
      prioritySupport: plan !== 'free'
    }
    
    return new Response(JSON.stringify({
      plan,
      status,
      analysesRemaining,
      analysesUsed,
      teamId,
      teamRole,
      currentPeriodEnd,
      pendingInvitation,
      features,
      user: {
        id: user.id,
        email: user.email
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('License validation error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
