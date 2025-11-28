# A11y Audit Pro - Backend Setup Guide

## Overview
This backend handles:
1. Razorpay webhook verification
2. License management  
3. Team seat management
4. Usage tracking

## Technology Stack
- **Supabase** (PostgreSQL + Edge Functions)
- **Razorpay** (Payment gateway)

---

## Quick Setup (15 minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Choose organization, name it "a11y-audit-pro"
4. Set a strong database password (save it!)
5. Choose region closest to your users
6. Click "Create new project" (wait 2 min)

**Save these values:**
- Project URL: `https://xxxx.supabase.co`
- Anon Key: `eyJxxxx...` (Settings → API)
- Service Role Key: `eyJxxxx...` (Settings → API - KEEP SECRET!)
- Project Reference: `xxxx` (from URL)

---

### Step 2: Run Database Schema

1. In Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy entire contents of `schema.sql` file
4. Click "Run" (RUN button or Cmd/Ctrl + Enter)
5. Should see "Success. No rows returned"

---

### Step 3: Deploy Edge Functions

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login
# (Opens browser to authenticate)

# 3. Navigate to backend folder
cd backend

# 4. Initialize Supabase (if not done)
supabase init

# 5. Link to your project
supabase link --project-ref YOUR_PROJECT_REF
# Replace YOUR_PROJECT_REF with your project reference

# 6. Deploy all functions
supabase functions deploy razorpay-webhook
supabase functions deploy validate-license
supabase functions deploy team-management
supabase functions deploy record-usage
```

---

### Step 4: Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Add new secret:

| Name | Value |
|------|-------|
| `RAZORPAY_KEY_ID` | `rzp_test_RkmwYLTth09O1G` |
| `RAZORPAY_KEY_SECRET` | `Mav8640HJ1nSDRqnKrvJemRc` |
| `RAZORPAY_WEBHOOK_SECRET` | (from Step 5) |

---

### Step 5: Configure Razorpay Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Add New Webhook"
3. Webhook URL: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-webhook`
4. Create a webhook secret (random string) - SAVE IT
5. Enable events:
   - ✅ payment.captured
   - ✅ subscription.activated
   - ✅ subscription.charged
   - ✅ subscription.cancelled
   - ✅ subscription.paused
   - ✅ subscription.resumed
6. Click "Create Webhook"
7. Add the webhook secret to Supabase env vars (Step 4)

---

### Step 6: Update Plugin with Backend URL

In your plugin, update the API base URL:
```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

---

## API Endpoints

### POST /functions/v1/razorpay-webhook
Receives Razorpay webhook events (called by Razorpay automatically)

### POST /functions/v1/validate-license
Validates user subscription status
```json
// Request
{
  "figmaUserId": "user_xxx",
  "email": "user@email.com"
}

// Response
{
  "plan": "pro",
  "status": "active",
  "analysesRemaining": -1,
  "teamId": null,
  "features": {
    "unlimitedAnalyses": true,
    "history": true,
    "oneClickFixes": true
  }
}
```

### POST /functions/v1/team-management
Manages team seats
```json
// List members
{ "action": "list", "teamId": "xxx", "adminEmail": "admin@email.com" }

// Invite member
{ "action": "invite", "teamId": "xxx", "adminEmail": "admin@email.com", "memberEmail": "new@email.com" }

// Remove member
{ "action": "remove", "teamId": "xxx", "adminEmail": "admin@email.com", "memberEmail": "member@email.com" }

// Get team by admin
{ "action": "get-team", "adminEmail": "admin@email.com" }
```

### POST /functions/v1/record-usage
Records analysis for usage tracking
```json
// Request
{ "figmaUserId": "user_xxx", "email": "user@email.com" }

// Response
{ "allowed": true, "remaining": 8, "plan": "free" }
```

---

## File Structure

```
backend/
├── README.md                    # This file
├── schema.sql                   # Database schema
└── supabase/
    └── functions/
        ├── razorpay-webhook/    # Handles Razorpay events
        │   └── index.ts
        ├── validate-license/    # Validates user subscription
        │   └── index.ts
        ├── team-management/     # Team seat management
        │   └── index.ts
        └── record-usage/        # Usage tracking
            └── index.ts
```

---

## Testing

### Test Webhook Locally
```bash
# Use ngrok to expose local server
ngrok http 54321

# Update Razorpay webhook URL to ngrok URL
# Then use Razorpay test mode to trigger events
```

### Test API Endpoints
```bash
# Validate license
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/validate-license \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Record usage
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/record-usage \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Troubleshooting

### "Function not found" error
- Make sure functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs razorpay-webhook`

### Webhook signature invalid
- Verify RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard
- Check webhook URL is correct (no trailing slash)

### Database errors
- Check SQL schema was run successfully
- Verify RLS policies are enabled

---

## Security Notes

1. **Never expose Service Role Key** - only use in Edge Functions
2. **Verify webhook signatures** - prevents fake payment events  
3. **Use Row Level Security (RLS)** - enabled by default
4. **HTTPS only** - Supabase enforces this
5. **Rate limiting** - consider adding for production
