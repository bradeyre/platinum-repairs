# 🛡️ Safe Deployment Guide for Platinum Repairs

## Current Deployment Status
- **Active Deployment**: `platinum-repairs-clean/` (connected to GitHub)
- **Backup Created**: `platinum-repairs-backup-[timestamp]/`
- **Vercel Project**: Connected to GitHub repository

## Safe Development Workflow

### 1. Before Making Changes
```bash
# Always work in the platinum-repairs-clean directory
cd "/Users/Focus/Downloads/TechDash 2.0/platinum-repairs-clean"

# Create a backup before major changes
cp -r . ../platinum-repairs-backup-$(date +%Y%m%d-%H%M%S)
```

### 2. Testing Changes Locally
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Test on http://localhost:3000
```

### 3. Safe Deployment Process
```bash
# 1. Test all changes locally first
npm run build  # Ensure no build errors

# 2. Commit changes with descriptive messages
git add .
git commit -m "Feature: Add mobile optimization and photo upload"

# 3. Push to GitHub (triggers Vercel deployment)
git push origin main

# 4. Monitor deployment in Vercel dashboard
# 5. Test live site after deployment
```

### 4. Rollback Strategy (if needed)
```bash
# If something breaks, you can:
# 1. Revert to previous commit
git log --oneline  # Find last working commit
git reset --hard [commit-hash]
git push origin main --force

# 2. Or restore from backup
cp -r ../platinum-repairs-backup-[timestamp]/* .
git add .
git commit -m "Emergency rollback"
git push origin main
```

## Environment Variables (Already Set in Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- REPAIRSHOPR_TOKEN
- REPAIRSHOPR_TOKEN_DD
- OPENAI_API_KEY (if available)

## Testing Checklist Before Deployment
- [ ] All pages load without errors
- [ ] Login works for all user types
- [ ] Ticket assignment functions properly
- [ ] Damage report creation works
- [ ] Photo uploads work
- [ ] Mobile interface is responsive
- [ ] Performance metrics display correctly

## Emergency Contacts
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repository: Check your GitHub account
- Supabase Dashboard: https://supabase.com/dashboard
