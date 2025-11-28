// Razorpay Webhook Handler for A11y Audit Pro
// Deploy: supabase functions deploy razorpay-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    
    // Verify webhook signature
    if (!await verifySignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const payload = JSON.parse(body)
    const event = payload.event
    const eventPayload = payload.payload
    
    console.log('Received webhook event:', event)
    
    // Log webhook for debugging
    await supabase.from('webhook_logs').insert({
      event_type: event,
      payload: payload,
      processed: false
    })
    
    // Handle different events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(supabase, eventPayload)
        break
        
      case 'subscription.activated':
        await handleSubscriptionActivated(supabase, eventPayload)
        break
        
      case 'subscription.charged':
        await handleSubscriptionCharged(supabase, eventPayload)
        break
        
      case 'subscription.cancelled':
      case 'subscription.paused':
        await handleSubscriptionCancelled(supabase, eventPayload, event)
        break
        
      case 'subscription.resumed':
        await handleSubscriptionResumed(supabase, eventPayload)
        break
        
      default:
        console.log('Unhandled event type:', event)
    }
    
    // Mark webhook as processed
    await supabase.from('webhook_logs')
      .update({ processed: true })
      .eq('payload->event', event)
      .order('created_at', { ascending: false })
      .limit(1)
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Verify Razorpay webhook signature using HMAC SHA256
async function verifySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false
  
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    )
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

// Handle payment.captured event
async function handlePaymentCaptured(supabase: any, payload: any) {
  const payment = payload.payment?.entity
  if (!payment) return
  
  const email = payment.email || payment.notes?.email
  const figmaUserId = payment.notes?.figma_user_id
  
  // Get or create user
  let userId: string
  
  if (figmaUserId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single()
    
    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ figma_user_id: figmaUserId, email })
        .select('id')
        .single()
      userId = newUser.id
    }
  } else if (email) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ figma_user_id: `temp_${Date.now()}`, email })
        .select('id')
        .single()
      userId = newUser.id
    }
  } else {
    console.error('No user identifier in payment')
    return
  }
  
  // Record payment
  await supabase.from('payments').insert({
    user_id: userId,
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    metadata: payment
  })
  
  console.log('Payment recorded:', payment.id)
}

// Handle subscription.activated event
async function handleSubscriptionActivated(supabase: any, payload: any) {
  const subscription = payload.subscription?.entity
  if (!subscription) return
  
  const email = subscription.notes?.email || subscription.customer_email
  const figmaUserId = subscription.notes?.figma_user_id
  
  // Get or create user
  let userId: string
  
  if (figmaUserId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single()
    
    if (existingUser) {
      userId = existingUser.id
      // Update email if we have it
      if (email) {
        await supabase.from('users').update({ email }).eq('id', userId)
      }
    } else {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ figma_user_id: figmaUserId, email })
        .select('id')
        .single()
      userId = newUser.id
    }
  } else {
    console.error('No figma_user_id in subscription notes')
    return
  }
  
  // Determine plan from amount (in paise)
  // Pro: 50000 (monthly) or 500000 (annual)
  // Team: 185000 (monthly) or 1850000 (annual)
  const amount = subscription.plan?.item?.amount || 0
  const plan = amount >= 185000 ? 'team' : 'pro'
  const billingCycle = amount >= 500000 || amount >= 1850000 ? 'annual' : 'monthly'
  
  // Create subscription record
  const { data: newSub } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan,
      billing_cycle: billingCycle,
      status: 'active',
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: subscription.customer_id,
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      amount: amount,
      currency: subscription.plan?.item?.currency || 'INR'
    })
    .select('id')
    .single()
  
  // If team plan, create team
  if (plan === 'team' && newSub) {
    const { data: team } = await supabase
      .from('teams')
      .insert({
        name: `${email?.split('@')[0] || 'My'}'s Team`,
        admin_user_id: userId,
        subscription_id: newSub.id,
        total_seats: 5,
        used_seats: 1
      })
      .select('id')
      .single()
    
    // Add admin as first team member
    if (team) {
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        email: email,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString()
      })
    }
  }
  
  console.log('Subscription activated:', subscription.id, 'Plan:', plan)
}

// Handle subscription.charged event (renewals)
async function handleSubscriptionCharged(supabase: any, payload: any) {
  const subscription = payload.subscription?.entity
  const payment = payload.payment?.entity
  if (!subscription) return
  
  // Update subscription period
  await supabase
    .from('subscriptions')
    .update({
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      status: 'active'
    })
    .eq('razorpay_subscription_id', subscription.id)
  
  // Record payment if present
  if (payment) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('razorpay_subscription_id', subscription.id)
      .single()
    
    if (sub) {
      await supabase.from('payments').insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        razorpay_payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: 'captured',
        metadata: { type: 'renewal', subscription_id: subscription.id }
      })
    }
  }
  
  console.log('Subscription charged:', subscription.id)
}

// Handle subscription.cancelled or subscription.paused
async function handleSubscriptionCancelled(supabase: any, payload: any, event: string) {
  const subscription = payload.subscription?.entity
  if (!subscription) return
  
  const status = event === 'subscription.cancelled' ? 'cancelled' : 'paused'
  
  await supabase
    .from('subscriptions')
    .update({ status })
    .eq('razorpay_subscription_id', subscription.id)
  
  console.log('Subscription', status, ':', subscription.id)
}

// Handle subscription.resumed
async function handleSubscriptionResumed(supabase: any, payload: any) {
  const subscription = payload.subscription?.entity
  if (!subscription) return
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: new Date(subscription.current_end * 1000).toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id)
  
  console.log('Subscription resumed:', subscription.id)
}
