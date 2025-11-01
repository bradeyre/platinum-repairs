# Complete Deployment Guide

## Overview

This guide covers deploying the Platinum Repairs application from a fresh download to a live production environment.

## Current Status

**What You Have**: Downloaded folder (`platinum-repairs-main`)
**What You Need**: Live deployment on Vercel with GitHub integration

## Prerequisites

1. **GitHub Account**: https://github.com
2. **Vercel Account**: https://vercel.com (sign up with GitHub)
3. **Supabase Account**: https://supabase.com (for database)
4. **OpenAI Account** (optional): https://platform.openai.com (for AI features)
5. **Node.js**: v18 or higher
6. **Git**: Installed on your system

## Step-by-Step Deployment

### Phase 1: Local Setup

#### 1.1 Initialize Git Repository

```bash
# Navigate to your project folder
cd /path/to/platinum-repairs-main

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Platinum Repairs TechDash 2.0"
```

#### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `platinum-repairs` (or your preferred name)
3. Description: "Platinum Repairs TechDash 2.0 - Repair Management System"
4. Visibility: **Private** (recommended for business application)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

#### 1.3 Connect Local Repository to GitHub

```bash
# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/platinum-repairs.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

#### 1.4 Create Environment File

Create `.env.local` in the root directory:

```bash
# Create the file
touch .env.local

# Edit with your preferred editor
nano .env.local
# or
code .env.local
```

Add the required environment variables (see ENVIRONMENT_SETUP.md for complete list):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://hplkxqwaxpoubbmnjulo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REPAIRSHOPR_TOKEN=T0c8dba3f0694983f4-764b5c6394a4fbfc181b4aad41f567c8
REPAIRSHOPR_TOKEN_DD=T1061bd85843359e0e-7b4026074327cf4d3e0e0d018f8ba88f
OPENAI_API_KEY=sk-your-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENABLE_REALTIME_SYNC=true
```

#### 1.5 Install Dependencies & Test Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
# Test login with: brad / b123456
```

### Phase 2: Database Setup (Supabase)

#### 2.1 Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Log in or create account
3. Find your existing project or create a new one
4. Note your project URL and keys

#### 2.2 Execute Database Schemas

In Supabase Dashboard → SQL Editor, execute these files in order:

1. **parts-pricing-schema.sql**
   ```sql
   -- Creates parts_pricing table for Google Sheets sync
   ```

2. **damage-reports-schema.sql**
   ```sql
   -- Creates damage_reports table
   ```

3. **repair-photos-schema.sql**
   ```sql
   -- Creates repair_photos and repair_completions tables
   ```

4. **time-tracking-schema.sql**
   ```sql
   -- Creates time_tracking tables
   ```

5. **ticket-wait-times-schema.sql**
   ```sql
   -- Creates ticket_wait_times table
   ```

6. **technician-tracking-schema.sql**
   ```sql
   -- Creates technician performance tracking tables
   ```

7. **ticket-lifecycle-schema-final.sql**
   ```sql
   -- Creates ticket lifecycle tracking tables
   ```

#### 2.3 Verify Database Tables

In Supabase Dashboard → Table Editor, verify these tables exist:
- users
- parts_pricing
- damage_reports
- repair_photos
- repair_completions
- time_tracking
- ticket_wait_times
- technician_performance

### Phase 3: Vercel Deployment

#### 3.1 Connect Vercel to GitHub

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Select your GitHub repository (`platinum-repairs`)
5. Click "Import"

#### 3.2 Configure Build Settings

Vercel should auto-detect Next.js settings:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

Leave these as default unless you have specific requirements.

#### 3.3 Add Environment Variables

In the Vercel project configuration, add all environment variables:

Click "Environment Variables" and add:

```
NEXT_PUBLIC_SUPABASE_URL = https://hplkxqwaxpoubbmnjulo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REPAIRSHOPR_TOKEN = T0c8dba3f0694983f4-764b5c6394a4fbfc181b4aad41f567c8
REPAIRSHOPR_TOKEN_DD = T1061bd85843359e0e-7b4026074327cf4d3e0e0d018f8ba88f
OPENAI_API_KEY = sk-your-key-here
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
ENABLE_REALTIME_SYNC = true
```

**Important**: Select all environments (Production, Preview, Development) for each variable.

#### 3.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Once deployed, you'll get a URL like: `https://platinum-repairs.vercel.app`

### Phase 4: Post-Deployment Setup

#### 4.1 Setup Users

Call the setup-users endpoint to create default user accounts:

```bash
# Replace with your actual Vercel URL
curl -X POST https://your-app.vercel.app/api/setup-users
```

Expected response:
```json
{
  "success": true,
  "message": "Users setup completed",
  "usersCreated": 12
}
```

#### 4.2 Sync Parts Pricing from Google Sheets

```bash
curl -X POST https://your-app.vercel.app/api/google-sheets/sync
```

Expected response:
```json
{
  "success": true,
  "partsCount": 150,
  "message": "Parts pricing synced successfully"
}
```

#### 4.3 Test API Endpoints

```bash
# Test RepairShopr API connections
curl https://your-app.vercel.app/api/test-apis

# Expected response:
{
  "environment": {
    "prToken": "Present",
    "ddToken": "Present"
  },
  "prApi": {
    "status": "200",
    "totalTickets": 35
  },
  "ddApi": {
    "status": "200",
    "totalTickets": 10
  }
}
```

#### 4.4 Test Login

1. Open your Vercel URL in browser
2. Try logging in with default credentials:
   - Admin: `brad` / `b123456`
   - Technician: `marshal` / `m123456`
   - Claim Manager: `dane` / `d123456`

#### 4.5 Verify Functionality

Test these key features:
- [ ] Login works for all user types
- [ ] Admin dashboard shows tickets from both PR and DD
- [ ] Technician can claim tickets
- [ ] Damage report modal opens and works
- [ ] Repair completion modal works
- [ ] Photos upload successfully
- [ ] AI analysis works (if OpenAI key is set)
- [ ] Parts pricing loads from Google Sheets

### Phase 5: Custom Domain (Optional)

#### 5.1 Add Custom Domain in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain: `platinumrepairs.co.za`
4. Follow Vercel's instructions to configure DNS

#### 5.2 Update Environment Variable

Update `NEXT_PUBLIC_APP_URL` in Vercel:
```
NEXT_PUBLIC_APP_URL = https://platinumrepairs.co.za
```

#### 5.3 Redeploy

After changing environment variables, trigger a redeploy:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Click "Redeploy"

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"
git push origin main

# Vercel automatically builds and deploys
# Check status at https://vercel.com/dashboard
```

### Manual Deployment Trigger

To force a redeploy without code changes:

```bash
# Update deployment trigger file
echo "Force redeploy - $(date)" > DEPLOYMENT_TRIGGER.txt
git add DEPLOYMENT_TRIGGER.txt
git commit -m "Force redeploy"
git push origin main
```

## Branching Strategy

### Recommended Git Workflow

```bash
# Create development branch
git checkout -b development

# Make changes
git add .
git commit -m "Feature: Add new functionality"
git push origin development

# Vercel will create a preview deployment for this branch
# Test at: https://platinum-repairs-git-development-username.vercel.app

# When ready, merge to main
git checkout main
git merge development
git push origin main
```

### Branch Deployment URLs

- **main** → `https://platinum-repairs.vercel.app` (production)
- **development** → `https://platinum-repairs-git-development-username.vercel.app` (preview)
- **feature-xyz** → `https://platinum-repairs-git-feature-xyz-username.vercel.app` (preview)

## Monitoring & Maintenance

### Vercel Dashboard

Monitor your deployment at:
- **Overview**: https://vercel.com/dashboard
- **Deployments**: View all deployments and their status
- **Logs**: Real-time function logs
- **Analytics**: Usage statistics

### Health Checks

Set up monitoring for these endpoints:
- `https://your-app.vercel.app/api/test-apis` - API health
- `https://your-app.vercel.app/api/tickets` - Ticket fetching
- `https://your-app.vercel.app/` - Main application

### Regular Maintenance Tasks

**Daily**:
- Check Vercel logs for errors
- Monitor API usage (RepairShopr, OpenAI)

**Weekly**:
- Sync parts pricing: `POST /api/google-sheets/sync`
- Review performance metrics in admin dashboard

**Monthly**:
- Review and optimize database queries
- Check Supabase storage usage
- Update dependencies: `npm update`

## Rollback Procedure

If a deployment breaks production:

### Method 1: Vercel Dashboard

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Method 2: Git Revert

```bash
# Find the commit hash of the last working version
git log --oneline

# Revert to that commit
git revert HEAD
# or
git reset --hard <commit-hash>

# Force push (be careful!)
git push origin main --force
```

### Method 3: Instant Rollback

```bash
# Vercel CLI (install with: npm i -g vercel)
vercel rollback
```

## Troubleshooting

### Build Fails on Vercel

**Check**:
1. Build logs in Vercel Dashboard
2. TypeScript errors: Run `npm run build` locally
3. Missing dependencies: Check `package.json`
4. Environment variables: Verify all are set

**Common Fixes**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Test build locally
npm run build
```

### Environment Variables Not Working

**Check**:
1. Variables are set in Vercel Dashboard
2. Variables are set for correct environment (Production/Preview/Development)
3. Variable names match exactly (case-sensitive)
4. No extra spaces in variable values

**Fix**:
1. Update variables in Vercel Dashboard
2. Trigger redeploy

### API Endpoints Return 500 Errors

**Check**:
1. Vercel function logs
2. Database connection (Supabase)
3. External API status (RepairShopr, OpenAI)
4. Environment variables are set

**Debug**:
```bash
# Test endpoints individually
curl https://your-app.vercel.app/api/test-env
curl https://your-app.vercel.app/api/test-apis
```

### Database Connection Issues

**Check**:
1. Supabase project is active
2. Database credentials are correct
3. Row Level Security (RLS) policies are set up
4. Tables exist and have correct schema

**Fix**:
1. Verify Supabase credentials in Vercel
2. Re-run database schema files
3. Check Supabase logs

## Security Checklist

Before going live:

- [ ] All environment variables are set in Vercel (not hardcoded)
- [ ] Supabase RLS policies are enabled
- [ ] GitHub repository is private
- [ ] API keys are not exposed in client-side code
- [ ] CORS is properly configured
- [ ] Rate limiting is considered (if needed)
- [ ] User passwords follow security best practices
- [ ] HTTPS is enforced (automatic with Vercel)

## Performance Optimization

### Recommended Settings

1. **Vercel Function Region**: Set to closest region to Supabase
2. **Caching**: Enable for static assets
3. **Image Optimization**: Use Next.js Image component
4. **Database Connection Pooling**: Configure in Supabase

### Monitoring Performance

- Use Vercel Analytics
- Monitor function execution times
- Track API response times
- Monitor database query performance in Supabase

## Backup Strategy

### Database Backups

Supabase provides automatic daily backups. To create manual backup:

1. Go to Supabase Dashboard → Database → Backups
2. Click "Create Backup"
3. Download backup file

### Code Backups

- **GitHub**: Automatic version control
- **Vercel**: Keeps deployment history
- **Local**: Keep local copy of repository

### Environment Variables Backup

Save a copy of all environment variables in a secure location (password manager, encrypted file).

## Support & Resources

### Documentation
- This guide: `DEPLOYMENT_GUIDE.md`
- Environment setup: `ENVIRONMENT_SETUP.md`
- System architecture: `SYSTEM_ARCHITECTURE.md`
- API docs: `API_DOCUMENTATION.md`

### External Resources
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Docs**: https://docs.github.com

### Getting Help

1. Check Vercel deployment logs
2. Review Supabase database logs
3. Test API endpoints with curl
4. Check browser console for client-side errors
5. Review this documentation

## Conclusion

You should now have:
- ✅ Git repository initialized and pushed to GitHub
- ✅ Vercel project connected to GitHub
- ✅ Database set up in Supabase
- ✅ All environment variables configured
- ✅ Application deployed and accessible
- ✅ Users created and tested
- ✅ Continuous deployment enabled

Your application is now live and will automatically deploy on every push to the main branch!

**Next Steps**:
1. Test all functionality thoroughly
2. Train users on the system
3. Monitor performance and errors
4. Plan for future enhancements

