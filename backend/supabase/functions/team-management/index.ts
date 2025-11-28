// Team Management API for A11y Audit Pro
// Deploy: supabase functions deploy team-management

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
    
    const { action, teamId, figmaUserId, email, memberEmail } = await req.json()
    
    switch (action) {
      case 'list':
        return await listTeamMembers(supabase, teamId)
        
      case 'invite':
        return await inviteMember(supabase, teamId, figmaUserId, memberEmail)
        
      case 'remove':
        return await removeMember(supabase, teamId, figmaUserId, memberEmail)
        
      case 'accept':
        return await acceptInvitation(supabase, figmaUserId, email)
        
      case 'get-team':
        return await getTeamByAdmin(supabase, email)
        
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
    
  } catch (error) {
    console.error('Team management error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// List team members
async function listTeamMembers(supabase: any, teamId: string) {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        id,
        email,
        role,
        status,
        invited_at,
        joined_at,
        users (email, figma_user_id)
      )
    `)
    .eq('id', teamId)
    .single()
  
  if (teamError || !team) {
    return new Response(JSON.stringify({ error: 'Team not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Filter out removed members for display
  const activeMembers = team.team_members.filter((m: any) => m.status !== 'removed')
  
  return new Response(JSON.stringify({
    team: {
      id: team.id,
      name: team.name,
      totalSeats: team.total_seats,
      usedSeats: team.used_seats,
      availableSeats: team.total_seats - team.used_seats
    },
    members: activeMembers.map((m: any) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      invitedAt: m.invited_at,
      joinedAt: m.joined_at
    }))
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Invite a new member
async function inviteMember(supabase: any, teamId: string, figmaUserId: string, memberEmail: string) {
  if (!memberEmail || !memberEmail.includes('@')) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Verify requester is admin
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('figma_user_id', figmaUserId)
    .single()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .eq('admin_user_id', user.id)
    .single()
  
  if (!team) {
    return new Response(JSON.stringify({ error: 'Not team admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Check if seats available
  if (team.used_seats >= team.total_seats) {
    return new Response(JSON.stringify({ error: 'No seats available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Check if already a member
  const { data: existing } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', teamId)
    .eq('email', memberEmail.toLowerCase())
    .single()
  
  if (existing) {
    if (existing.status === 'active') {
      return new Response(JSON.stringify({ error: 'Already a member' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (existing.status === 'pending') {
      return new Response(JSON.stringify({ error: 'Invitation already sent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // If removed, reactivate as pending
    await supabase
      .from('team_members')
      .update({ status: 'pending', invited_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    // Create new invitation
    await supabase.from('team_members').insert({
      team_id: teamId,
      email: memberEmail.toLowerCase(),
      role: 'member',
      status: 'pending'
    })
  }
  
  return new Response(JSON.stringify({ success: true, message: 'Invitation sent' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Remove a member
async function removeMember(supabase: any, teamId: string, figmaUserId: string, memberEmail: string) {
  // Verify requester is admin
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('figma_user_id', figmaUserId)
    .single()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .eq('admin_user_id', user.id)
    .single()
  
  if (!team) {
    return new Response(JSON.stringify({ error: 'Not team admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Find member
  const { data: member } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('email', memberEmail.toLowerCase())
    .single()
  
  if (!member) {
    return new Response(JSON.stringify({ error: 'Member not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Can't remove admin
  if (member.role === 'admin') {
    return new Response(JSON.stringify({ error: 'Cannot remove admin' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Mark as removed
  await supabase
    .from('team_members')
    .update({ status: 'removed' })
    .eq('id', member.id)
  
  // Update seat count if was active
  if (member.status === 'active') {
    await supabase
      .from('teams')
      .update({ used_seats: Math.max(1, team.used_seats - 1) })
      .eq('id', teamId)
  }
  
  return new Response(JSON.stringify({ success: true, message: 'Member removed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Accept team invitation
async function acceptInvitation(supabase: any, figmaUserId: string, email: string) {
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
  
  // Find pending invitation
  const { data: invitation } = await supabase
    .from('team_members')
    .select(`
      *,
      teams (id, name, used_seats, total_seats)
    `)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single()
  
  if (!invitation) {
    return new Response(JSON.stringify({ error: 'No pending invitation' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Check seats
  if (invitation.teams.used_seats >= invitation.teams.total_seats) {
    return new Response(JSON.stringify({ error: 'No seats available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  // Accept invitation
  await supabase
    .from('team_members')
    .update({
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString()
    })
    .eq('id', invitation.id)
  
  // Update seat count
  await supabase
    .from('teams')
    .update({ used_seats: invitation.teams.used_seats + 1 })
    .eq('id', invitation.team_id)
  
  return new Response(JSON.stringify({
    success: true,
    teamId: invitation.team_id,
    teamName: invitation.teams.name
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get team by admin email
async function getTeamByAdmin(supabase: any, email: string) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('admin_user_id', user.id)
    .single()
  
  if (!team) {
    return new Response(JSON.stringify({ error: 'No team found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({ team }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
