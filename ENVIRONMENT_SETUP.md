# Environment Setup Guide

## Required Files

### 1. Create `.env.local` File

You **MUST** create a `.env.local` file in the root directory with the following environment variables:

```bash
# ============================================
# SUPABASE CONFIGURATION
# ============================================
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://hplkxqwaxpoubbmnjulo.supabase.co

# Supabase anonymous key (public, safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwbGt4cXdheHBvdWJibW5qdWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDc1MjUsImV4cCI6MjA3MTk4MzUyNX0.hbk8_vmOl6dSnL5SjHL6cICP12V9athGWzdeMpgekh4

# Supabase service role key (PRIVATE, server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwbGt4cXdheHBvdWJibW5qdWxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwNzUyNSwiZXhwIjoyMDcxOTgzNTI1fQ.rnxsOlmmsM-sdwRpAGCMPkbfr-m-u9WdEIoRXLyCCs8

# ============================================
# REPAIRSHOPR API TOKENS
# ============================================
# Platinum Repairs API token
REPAIRSHOPR_TOKEN=T0c8dba3f0694983f4-764b5c6394a4fbfc181b4aad41f567c8

# Device Doctor API token
REPAIRSHOPR_TOKEN_DD=T1061bd85843359e0e-7b4026074327cf4d3e0e0d018f8ba88f

# ============================================
# OPENAI API (for AI features)
# ============================================
# OpenAI API key for device detection and repair analysis
# Get your key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================
# APP CONFIGURATION
# ============================================
# Public URL of your application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Enable real-time sync features
ENABLE_REALTIME_SYNC=true
```

### 2. File Location
The `.env.local` file should be in the root directory:
```
platinum-repairs-main/
├── .env.local          ← CREATE THIS FILE
├── package.json
├── next.config.js
├── app/
├── lib/
└── components/
```

### 3. Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS**:

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **SUPABASE_SERVICE_ROLE_KEY** - This is a PRIVATE key with full database access. Never expose it to the client.
3. **OPENAI_API_KEY** - Keep this private, it's tied to your billing account
4. **REPAIRSHOPR_TOKEN** - These tokens have full access to RepairShopr data

### 4. Hardcoded Credentials Issue

⚠️ **CRITICAL**: The file `lib/supabase.ts` currently has hardcoded credentials:

```typescript
// lib/supabase.ts (lines 3-6)
const supabaseUrl = 'https://hplkxqwaxpoubbmnjulo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Recommendation**: Update `lib/supabase.ts` to use environment variables:

```typescript
// Better approach:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
```

## Vercel Deployment Environment Variables

When deploying to Vercel, you need to set these environment variables in the Vercel Dashboard:

### Steps to Add Environment Variables in Vercel:

1. Go to your Vercel project dashboard
2. Navigate to: **Settings** → **Environment Variables**
3. Add each variable with these settings:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Variable value
   - **Environments**: Select all (Production, Preview, Development)

### Required Vercel Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
REPAIRSHOPR_TOKEN
REPAIRSHOPR_TOKEN_DD
OPENAI_API_KEY
NEXT_PUBLIC_APP_URL (set to your production URL)
ENABLE_REALTIME_SYNC
```

## Environment Variable Naming Convention

### `NEXT_PUBLIC_` Prefix
- Variables with this prefix are exposed to the browser
- Safe for public API keys and configuration
- Examples: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`

### No Prefix
- Server-side only variables
- Never exposed to the browser
- Examples: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

## Testing Environment Variables

### Test Locally
```bash
# Start development server
npm run dev

# Visit http://localhost:3000/api/test-env
# This endpoint will show which environment variables are set
```

### Test on Vercel
```bash
# After deployment, visit:
https://your-app.vercel.app/api/test-env
```

## Common Issues & Solutions

### Issue: "Missing required Supabase configuration"
**Solution**: Ensure `.env.local` exists and contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Issue: "RepairShopr tokens not found"
**Solution**: Add `REPAIRSHOPR_TOKEN` and `REPAIRSHOPR_TOKEN_DD` to `.env.local`

### Issue: Environment variables not loading
**Solution**: 
1. Restart the development server (`npm run dev`)
2. Clear Next.js cache: `rm -rf .next`
3. Rebuild: `npm run build`

### Issue: Variables work locally but not on Vercel
**Solution**: Check that all variables are set in Vercel Dashboard → Settings → Environment Variables

## OpenAI API Key Setup

### Getting an OpenAI API Key:

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Add to `.env.local` as `OPENAI_API_KEY=sk-...`

### OpenAI Usage:
- **Device Detection**: Analyzes ticket descriptions to identify device make/model
- **Repair Analysis**: Provides repair recommendations and checklists
- **Serial Extraction**: Extracts IMEI/serial numbers from text
- **Model**: GPT-3.5-turbo (cost-effective)

### Cost Considerations:
- Device detection: ~$0.001 per ticket (cached after first call)
- Repair analysis: ~$0.002 per analysis
- Expected monthly cost: $5-20 depending on usage

## Google Sheets Integration

**Good News**: No credentials needed for Google Sheets integration!

The system uses **public CSV export** from Google Sheets:
- Sheet ID: `1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE`
- Access: Public (anyone with link can view)
- No API key required
- No service account needed

## Database Setup (Supabase)

### Initial Database Setup:

1. **Access Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Log in to your project

2. **Run SQL Schema Files**:
   Execute these SQL files in order in the SQL Editor:
   ```
   1. parts-pricing-schema.sql
   2. damage-reports-schema.sql
   3. repair-photos-schema.sql
   4. time-tracking-schema.sql
   5. ticket-wait-times-schema.sql
   6. technician-tracking-schema.sql
   7. ticket-lifecycle-schema-final.sql
   ```

3. **Setup Users**:
   After deployment, call this endpoint to create default users:
   ```bash
   curl -X POST https://your-app.vercel.app/api/setup-users
   ```

### Default User Accounts:

#### Admins:
- brad / b123456
- andre / a123456
- celeste / c123456
- braam / b123456
- melany / m123456

#### Technicians:
- ben / b123456
- marshal / m123456
- malvin / m123456
- francis / f123456

#### Claim Managers:
- janine / j123456
- dane / d123456
- derilise / d123456

## Checklist Before First Run

- [ ] Created `.env.local` file in root directory
- [ ] Added all required environment variables to `.env.local`
- [ ] Obtained OpenAI API key (if using AI features)
- [ ] Ran `npm install` to install dependencies
- [ ] Started development server with `npm run dev`
- [ ] Visited http://localhost:3000 to verify it loads
- [ ] Tested login with default credentials
- [ ] Verified RepairShopr API connection at `/api/test-apis`

## Checklist Before Vercel Deployment

- [ ] All environment variables added to Vercel Dashboard
- [ ] Supabase database schemas executed
- [ ] Default users created via `/api/setup-users`
- [ ] Google Sheets parts data synced via `/api/google-sheets/sync`
- [ ] Tested all API endpoints work in production
- [ ] Verified login works with default credentials
- [ ] Checked RepairShopr ticket fetching works

## Quick Start Commands

```bash
# Install dependencies
npm install

# Create .env.local file
touch .env.local
# (then add the environment variables)

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **OpenAI API Docs**: https://platform.openai.com/docs
- **RepairShopr API Docs**: https://docs.repairshopr.com/

## Troubleshooting

### Check Environment Variables are Loading:
```bash
# In your code, add:
console.log('Env check:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasRepairToken: !!process.env.REPAIRSHOPR_TOKEN,
  hasOpenAI: !!process.env.OPENAI_API_KEY
})
```

### Verify API Endpoints:
```bash
# Test RepairShopr APIs
curl http://localhost:3000/api/test-apis

# Test environment variables
curl http://localhost:3000/api/test-env

# Test tickets endpoint
curl http://localhost:3000/api/tickets
```

### Clear Next.js Cache:
```bash
rm -rf .next
npm run dev
```

