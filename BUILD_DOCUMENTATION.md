# Platinum Repairs Dashboard - Build Documentation

## 🏗️ Project Structure

This project has **TWO separate Next.js applications** that both deploy to the same GitHub repository:

### Primary Deployment (Active)
- **Directory**: `/platinum-repairs-clean/`
- **Status**: ✅ **ACTIVE DEPLOYMENT**
- **Vercel Project**: This is the one actually being deployed
- **GitHub**: Connected to `https://github.com/bradeyre/platinum-repairs.git`

### Secondary Project (Inactive)
- **Directory**: `/platinum-repairs-nextjs/`
- **Status**: ❌ **NOT DEPLOYED**
- **Purpose**: Backup/development version
- **GitHub**: Same repository but not the active deployment

## 🔧 Environment Variables

### Required Environment Variables
All environment variables must be set in **Vercel Dashboard** → Project Settings → Environment Variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://hplkxqwaxpoubbmnjulo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RepairShopr API Tokens
REPAIRSHOPR_TOKEN=T0c8dba3f0694983f4-764b5c6394a4fbfc181b4aad41f567c8
REPAIRSHOPR_TOKEN_DD=T1061bd85843359e0e-7b4026074327cf4d3e0e0d018f8ba88f

# App Configuration
NEXT_PUBLIC_APP_URL=https://platinumrepairs.co.za
ENABLE_REALTIME_SYNC=true
```

### Local Development
For local development, copy the `.env.local` file from `/platinum-repairs/` to `/platinum-repairs-clean/`:

```bash
cp "/Users/Focus/Downloads/TechDash 2.0/platinum-repairs/.env.local" "/Users/Focus/Downloads/TechDash 2.0/platinum-repairs-clean/.env.local"
```

## 🔗 API Configuration

### RepairShopr API Endpoints

#### Platinum Repairs API
- **URL**: `https://platinumrepairs.repairshopr.com/api/v1/tickets`
- **Token**: `REPAIRSHOPR_TOKEN`
- **Purpose**: Fetches tickets from Platinum Repairs
- **Tag Color**: Blue "PR" tags

#### Device Doctor API
- **URL**: `https://devicedoctorsa.repairshopr.com/api/v1/tickets` ⚠️ **CRITICAL**
- **Token**: `REPAIRSHOPR_TOKEN_DD`
- **Purpose**: Fetches tickets from Device Doctor
- **Tag Color**: Green "DD" tags

### ⚠️ Critical URL Note
The Device Doctor URL is **NOT** `devicedoctor.repairshopr.com` or `devic_doctorsa.repairshopr.com`
It is **`devicedoctorsa.repairshopr.com`** (no underscores, no spaces)

## 🚀 Deployment Process

### 1. Always Work in the Correct Directory
```bash
cd "/Users/Focus/Downloads/TechDash 2.0/platinum-repairs-clean"
```

### 2. Make Changes
Edit files in the `platinum-repairs-clean` directory only.

### 3. Commit and Push
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

### 4. Force Redeploy (if needed)
```bash
echo "Force redeploy - $(date)" > DEPLOYMENT_TRIGGER.txt
git add . && git commit -m "Force redeploy" && git push origin main
```

## 🐛 Troubleshooting Guide

### Issue: Only PR Tickets Showing, No DD Tickets

#### Step 1: Check API URLs
Verify the URLs in `/lib/repairshopr.ts`:
```typescript
const REPAIRSHOPR_BASE_URL = 'https://platinumrepairs.repairshopr.com/api/v1'
const REPAIRSHOPR_DD_BASE_URL = 'https://devicedoctorsa.repairshopr.com/api/v1' // ⚠️ Correct URL
```

#### Step 2: Test APIs Directly
Visit: `https://your-app.vercel.app/api/test-apis`

Expected response:
```json
{
  "environment": {
    "prToken": "Present",
    "ddToken": "Present"
  },
  "prApi": {
    "status": "200",
    "totalTickets": 35,
    "error": null
  },
  "ddApi": {
    "status": "200", 
    "totalTickets": 10,
    "error": null
  }
}
```

#### Step 3: Check Environment Variables
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Verify both `REPAIRSHOPR_TOKEN` and `REPAIRSHOPR_TOKEN_DD` are present
3. Check they're set for "All Environments"

#### Step 4: Check API Token Validity
If getting 401 errors:
1. Log into RepairShopr accounts
2. Go to Settings → API
3. Generate new tokens if expired
4. Update Vercel environment variables

### Issue: Build Failures

#### TypeScript Errors
Common fixes:
```typescript
// Fix 1: Array type inference
let statuses: string[] = []
statuses = [...new Set(data.map(t => t.status as string))] as string[]

// Fix 2: HTTP status to string
status: response.status.toString()

// Fix 3: Error type definition
error: null as string | null
```

#### React 18 API Issues
```typescript
// Fix: Update import
import { createRoot } from 'react-dom/client'
```

### Issue: Console Shows Nothing

#### Check Browser Console
Look for these logs:
- `🚀 AdminDashboard component loaded!`
- `🚀 Admin page: Starting to fetch tickets...`
- `🚀 Admin page: API response status: 200`

#### Check Server Logs
Server-side logs won't appear in browser console. Use the test endpoint:
`/api/test-apis`

## 📋 Feature Requirements

### Ticket Display
- ✅ Show ticket **number** (not ID)
- ✅ Display both PR and DD tickets
- ✅ PR tickets: Blue "PR" tags
- ✅ DD tickets: Green "DD" tags
- ❌ Remove "Create DR" button

### Status Filtering
Only show these 5 statuses:
- `Awaiting Rework`
- `Awaiting Workshop Repairs`
- `Awaiting Damage Report`
- `Awaiting Repair`
- `In Progress`

### API Integration
- ✅ Pull from both RepairShopr instances
- ✅ Real-time updates every 5 minutes
- ✅ Proper error handling
- ✅ Debug logging

## 🔍 Debug Endpoints

### Test APIs
- **URL**: `/api/test-apis`
- **Purpose**: Test both RepairShopr APIs directly
- **Returns**: API status, ticket counts, error messages

### Main Tickets API
- **URL**: `/api/tickets`
- **Purpose**: Main endpoint for dashboard
- **Returns**: Processed tickets with filtering applied

## 📁 Key Files

### Core API Logic
- `/lib/repairshopr.ts` - Main API integration
- `/app/api/tickets/route.ts` - Main tickets endpoint
- `/app/api/test-apis/route.ts` - Debug endpoint

### UI Components
- `/app/dashboard/admin/page.tsx` - Main dashboard
- `/components/TicketClaimingModal.tsx` - Ticket assignment
- `/components/PerformanceLeaderboard.tsx` - Stats display

### Configuration
- `/next.config.js` - Next.js configuration
- `/tailwind.config.js` - Styling configuration
- `/tsconfig.json` - TypeScript configuration

## 🚨 Common Mistakes to Avoid

1. **Wrong Directory**: Always work in `platinum-repairs-clean/`
2. **Wrong URL**: Device Doctor is `devicedoctorsa.repairshopr.com`
3. **Missing Environment Variables**: Check Vercel dashboard
4. **Expired Tokens**: Regenerate API tokens if getting 401 errors
5. **TypeScript Errors**: Use proper type annotations
6. **Build Failures**: Check for syntax errors and missing imports

## 📞 Support

If issues persist:
1. Check this documentation first
2. Test the `/api/test-apis` endpoint
3. Verify environment variables in Vercel
4. Check RepairShopr API token validity
5. Review build logs in Vercel dashboard

---

**Last Updated**: September 5, 2025
**Version**: 1.0
**Status**: ✅ Working - Both APIs integrated successfully
