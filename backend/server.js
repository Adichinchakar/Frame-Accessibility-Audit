/**
 * A11y Audit Pro - Backend Server
 * Handles Razorpay webhooks, license management, and team features
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ============================================
// CONFIGURATION
// ============================================

const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  PORT = 3000,
  NODE_ENV = 'development',
  FRONTEND_URL = 'https://www.figma.com'
} = process.env;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:*', 'https://*.figma.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
}));

// Parse JSON for most routes
app.use(express.json());

// Raw body for webhook verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// ============================================
// PRICING CONFIGURATION
// ============================================

const PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    amount: 50000, // paise (₹500)
    currency: 'INR',
    interval: 'monthly',
    features: ['unlimited_analyses', 'wcag_switching', 'one_click_fixes', 'unlimited_history', 'priority_support']
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Pro Annual',
    amount: 500000, // paise (₹5000)
    currency: 'INR',
    interval: 'yearly',
    features: ['unlimited_analyses', 'wcag_switching', 'one_click_fixes', 'unlimited_history', 'priority_support']
  },
  team_monthly: {
    id: 'team_monthly',
    name: 'Team Monthly',
    amount: 185000, // paise (₹1850)
    currency: 'INR',
    interval: 'monthly',
    seats: 5,
    features: ['everything_in_pro', 'team_seats', 'shared_history', 'admin_controls', 'slack_support']
  },
  team_annual: {
    id: 'team_annual',
    name: 'Team Annual',
    amount: 1850000, // paise (₹18500)
    currency: 'INR',
    interval: 'yearly',
    seats: 5,
    features: ['everything_in_pro', 'team_seats', 'shared_history', 'admin_controls', 'slack_support']
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verify Razorpay webhook signature
 */
function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Generate a secure license key
 */
function generateLicenseKey() {
  return `A11Y-${uuidv4().toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Calculate subscription end date
 */
function calculateEndDate(interval) {
  const now = new Date();
  if (interval === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

// ============================================
// API ROUTES - ORDERS
// ============================================

/**
 * Create a Razorpay order for one-time payment
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { planId, email, userId } = req.body;
    
    if (!planId || !email || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: `order_${Date.now()}`,
      notes: {
        planId,
        email,
        userId
      }
    });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Create a Razorpay subscription for recurring payments
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { planId, email, userId } = req.body;
    
    if (!planId || !email || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    // For subscriptions, you need to create plans in Razorpay Dashboard first
    // Then use the plan_id from there
    // For now, we'll use one-time orders
    
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: plan.currency,
      receipt: `sub_${Date.now()}`,
      notes: {
        planId,
        email,
        userId,
        type: 'subscription'
      }
    });
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name
    });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ============================================
// API ROUTES - PAYMENT VERIFICATION
// ============================================

/**
 * Verify payment after Razorpay checkout
 */
app.post('/api/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      email,
      userId
    } = req.body;
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Get payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }
    
    const plan = PLANS[planId];
    const isTeamPlan = planId.startsWith('team');
    
    // Create or update license in database
    let license;
    
    if (isTeamPlan) {
      // Create team with license
      const teamId = uuidv4();
      
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name: `${email.split('@')[0]}'s Team`,
          admin_user_id: userId,
          admin_email: email,
          plan_id: planId,
          seats: plan.seats,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (teamError) throw teamError;
      
      // Create license for admin
      license = {
        id: uuidv4(),
        user_id: userId,
        email: email,
        plan: 'team',
        plan_id: planId,
        status: 'active',
        license_key: generateLicenseKey(),
        team_id: teamId,
        team_role: 'admin',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount_paid: payment.amount,
        currency: payment.currency,
        current_period_start: new Date().toISOString(),
        current_period_end: calculateEndDate(plan.interval),
        created_at: new Date().toISOString()
      };
      
      // Add admin as team member
      await supabase.from('team_members').insert({
        id: uuidv4(),
        team_id: teamId,
        user_id: userId,
        email: email,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString()
      });
      
    } else {
      // Create individual license
      license = {
        id: uuidv4(),
        user_id: userId,
        email: email,
        plan: 'pro',
        plan_id: planId,
        status: 'active',
        license_key: generateLicenseKey(),
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount_paid: payment.amount,
        currency: payment.currency,
        current_period_start: new Date().toISOString(),
        current_period_end: calculateEndDate(plan.interval),
        created_at: new Date().toISOString()
      };
    }
    
    // Insert license
    const { data: savedLicense, error: licenseError } = await supabase
      .from('licenses')
      .insert(license)
      .select()
      .single();
    
    if (licenseError) throw licenseError;
    
    // Return success with license details
    res.json({
      success: true,
      license: {
        licenseKey: savedLicense.license_key,
        plan: savedLicense.plan,
        planId: savedLicense.plan_id,
        status: savedLicense.status,
        teamId: savedLicense.team_id,
        teamRole: savedLicense.team_role,
        currentPeriodEnd: savedLicense.current_period_end
      }
    });
    
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ============================================
// API ROUTES - WEBHOOK HANDLER
// ============================================

/**
 * Razorpay Webhook Handler
 * Handles payment events from Razorpay
 */
app.post('/webhook/razorpay', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body.toString();
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(body);
    const { event: eventType, payload } = event;
    
    console.log(`Webhook received: ${eventType}`);
    
    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
        
      case 'subscription.activated':
        await handleSubscriptionActivated(payload.subscription.entity);
        break;
        
      case 'subscription.charged':
        await handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
        break;
        
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload.subscription.entity);
        break;
        
      case 'subscription.paused':
        await handleSubscriptionPaused(payload.subscription.entity);
        break;
        
      case 'subscription.resumed':
        await handleSubscriptionResumed(payload.subscription.entity);
        break;
        
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook handlers
async function handlePaymentCaptured(payment) {
  console.log('Payment captured:', payment.id);
  
  // Update license status if exists
  const { data, error } = await supabase
    .from('licenses')
    .update({ 
      status: 'active',
      last_payment_id: payment.id,
      updated_at: new Date().toISOString()
    })
    .eq('payment_id', payment.id);
  
  if (error) {
    console.error('Error updating license:', error);
  }
}

async function handlePaymentFailed(payment) {
  console.log('Payment failed:', payment.id);
  
  // Log failed payment
  await supabase.from('payment_logs').insert({
    payment_id: payment.id,
    status: 'failed',
    error_code: payment.error_code,
    error_description: payment.error_description,
    created_at: new Date().toISOString()
  });
}

async function handleSubscriptionActivated(subscription) {
  console.log('Subscription activated:', subscription.id);
  
  const { data, error } = await supabase
    .from('licenses')
    .update({
      subscription_id: subscription.id,
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', subscription.notes?.userId);
}

async function handleSubscriptionCharged(subscription, payment) {
  console.log('Subscription charged:', subscription.id);
  
  // Extend subscription period
  const { data: license } = await supabase
    .from('licenses')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();
  
  if (license) {
    const plan = PLANS[license.plan_id];
    await supabase
      .from('licenses')
      .update({
        current_period_end: calculateEndDate(plan.interval),
        last_payment_id: payment.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', license.id);
  }
}

async function handleSubscriptionCancelled(subscription) {
  console.log('Subscription cancelled:', subscription.id);
  
  await supabase
    .from('licenses')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);
}

async function handleSubscriptionPaused(subscription) {
  console.log('Subscription paused:', subscription.id);
  
  await supabase
    .from('licenses')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);
}

async function handleSubscriptionResumed(subscription) {
  console.log('Subscription resumed:', subscription.id);
  
  await supabase
    .from('licenses')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('subscription_id', subscription.id);
}

// ============================================
// API ROUTES - LICENSE MANAGEMENT
// ============================================

/**
 * Get license by user ID
 */
app.get('/api/license/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error || !license) {
      return res.json({ 
        plan: 'free', 
        status: 'active',
        features: []
      });
    }
    
    // Check if license is expired
    if (new Date(license.current_period_end) < new Date()) {
      return res.json({
        plan: 'free',
        status: 'expired',
        features: []
      });
    }
    
    const plan = PLANS[license.plan_id];
    
    res.json({
      licenseKey: license.license_key,
      plan: license.plan,
      planId: license.plan_id,
      status: license.status,
      teamId: license.team_id,
      teamRole: license.team_role,
      currentPeriodEnd: license.current_period_end,
      features: plan?.features || []
    });
    
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Failed to get license' });
  }
});

/**
 * Validate license key
 */
app.post('/api/license/validate', async (req, res) => {
  try {
    const { licenseKey, userId } = req.body;
    
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();
    
    if (error || !license) {
      return res.json({ valid: false, reason: 'License not found' });
    }
    
    if (license.status !== 'active') {
      return res.json({ valid: false, reason: 'License not active' });
    }
    
    if (new Date(license.current_period_end) < new Date()) {
      return res.json({ valid: false, reason: 'License expired' });
    }
    
    res.json({
      valid: true,
      license: {
        plan: license.plan,
        teamId: license.team_id,
        currentPeriodEnd: license.current_period_end
      }
    });
    
  } catch (error) {
    console.error('Validate license error:', error);
    res.status(500).json({ error: 'Failed to validate license' });
  }
});

// ============================================
// API ROUTES - TEAM MANAGEMENT
// ============================================

/**
 * Get team details
 */
app.get('/api/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.headers['x-user-id'];
    
    // Get team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    
    if (membersError) throw membersError;
    
    res.json({
      id: team.id,
      name: team.name,
      adminEmail: team.admin_email,
      planId: team.plan_id,
      seats: team.seats,
      usedSeats: members.filter(m => m.status === 'active').length,
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        role: m.role,
        status: m.status,
        joinedAt: m.joined_at
      })),
      createdAt: team.created_at
    });
    
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

/**
 * Invite team member
 */
app.post('/api/team/:teamId/invite', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, inviterUserId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Verify inviter is admin
    const { data: inviterMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', inviterUserId)
      .eq('role', 'admin')
      .single();
    
    if (!inviterMember) {
      return res.status(403).json({ error: 'Only admins can invite members' });
    }
    
    // Get team to check seat limit
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    // Count active members
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId)
      .in('status', ['active', 'pending']);
    
    if (count >= team.seats) {
      return res.status(400).json({ error: 'Team seat limit reached' });
    }
    
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('email', email)
      .single();
    
    if (existingMember) {
      return res.status(400).json({ error: 'User already invited' });
    }
    
    // Create invitation
    const inviteToken = uuidv4();
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        id: uuidv4(),
        team_id: teamId,
        email: email,
        role: 'member',
        status: 'pending',
        invite_token: inviteToken,
        invited_by: inviterUserId,
        invited_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (memberError) throw memberError;
    
    // TODO: Send invitation email
    // await sendInvitationEmail(email, team.name, inviteToken);
    
    res.json({
      success: true,
      member: {
        id: member.id,
        email: member.email,
        role: member.role,
        status: member.status
      },
      inviteToken // In production, don't return this - send via email
    });
    
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

/**
 * Accept team invitation
 */
app.post('/api/team/accept-invite', async (req, res) => {
  try {
    const { inviteToken, userId } = req.body;
    
    // Find invitation
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('invite_token', inviteToken)
      .eq('status', 'pending')
      .single();
    
    if (memberError || !member) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    
    // Update member status
    const { error: updateError } = await supabase
      .from('team_members')
      .update({
        user_id: userId,
        status: 'active',
        joined_at: new Date().toISOString(),
        invite_token: null
      })
      .eq('id', member.id);
    
    if (updateError) throw updateError;
    
    // Create license for new member
    const team = member.teams;
    const plan = PLANS[team.plan_id];
    
    const { data: adminLicense } = await supabase
      .from('licenses')
      .select('*')
      .eq('team_id', team.id)
      .eq('team_role', 'admin')
      .single();
    
    const license = {
      id: uuidv4(),
      user_id: userId,
      email: member.email,
      plan: 'team',
      plan_id: team.plan_id,
      status: 'active',
      license_key: generateLicenseKey(),
      team_id: team.id,
      team_role: 'member',
      current_period_start: adminLicense?.current_period_start,
      current_period_end: adminLicense?.current_period_end,
      created_at: new Date().toISOString()
    };
    
    await supabase.from('licenses').insert(license);
    
    res.json({
      success: true,
      team: {
        id: team.id,
        name: team.name
      },
      license: {
        licenseKey: license.license_key,
        plan: 'team'
      }
    });
    
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

/**
 * Remove team member
 */
app.delete('/api/team/:teamId/member/:memberId', async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const adminUserId = req.headers['x-user-id'];
    
    // Verify requester is admin
    const { data: adminMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single();
    
    if (!adminMember) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }
    
    // Get member to remove
    const { data: memberToRemove } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single();
    
    if (!memberToRemove) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    if (memberToRemove.role === 'admin') {
      return res.status(400).json({ error: 'Cannot remove team admin' });
    }
    
    // Update member status to removed
    await supabase
      .from('team_members')
      .update({ 
        status: 'removed',
        removed_at: new Date().toISOString()
      })
      .eq('id', memberId);
    
    // Revoke their license
    await supabase
      .from('licenses')
      .update({ status: 'revoked' })
      .eq('user_id', memberToRemove.user_id)
      .eq('team_id', teamId);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

/**
 * Update team name
 */
app.put('/api/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name } = req.body;
    const adminUserId = req.headers['x-user-id'];
    
    // Verify requester is admin
    const { data: adminMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single();
    
    if (!adminMember) {
      return res.status(403).json({ error: 'Only admins can update team' });
    }
    
    const { data: team, error } = await supabase
      .from('teams')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, team });
    
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * Leave team (for non-admin members)
 */
app.post('/api/team/:teamId/leave', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.headers['x-user-id'];
    
    // Get member
    const { data: member } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();
    
    if (!member) {
      return res.status(404).json({ error: 'Not a team member' });
    }
    
    if (member.role === 'admin') {
      return res.status(400).json({ error: 'Admin cannot leave team. Transfer ownership first.' });
    }
    
    // Update status
    await supabase
      .from('team_members')
      .update({ 
        status: 'left',
        left_at: new Date().toISOString()
      })
      .eq('id', member.id);
    
    // Revoke license
    await supabase
      .from('licenses')
      .update({ status: 'revoked' })
      .eq('user_id', userId)
      .eq('team_id', teamId);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 A11y Audit Pro Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
});

module.exports = app;