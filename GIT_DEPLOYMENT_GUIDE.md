# Git Deployment Quick Reference

## Overview

This guide provides step-by-step instructions for deploying code changes by pushing to GitHub, which automatically triggers Vercel deployment.

## Repository Information

- **GitHub Repository**: https://github.com/bradeyre/platinum-repairs
- **Branch**: `main` (production)
- **Owner**: bradeyre (shared repository)
- **Vercel**: Auto-deploys on push to main branch

## Prerequisites

- Git installed on your system
- Access to the shared GitHub repository
- Personal Access Token (PAT) for authentication

---

## Quick Deployment Steps

### 1. Check Current Status

```bash
git status
```

This shows which files have been modified.

### 2. Stage All Changes

```bash
git add .
```

Or stage specific files:

```bash
git add path/to/file.ts
```

### 3. Commit Changes

```bash
git commit -m "Description of your changes"
```

**Commit Message Examples:**
- `"Fix: Resolve ticket filtering issue"`
- `"Feature: Add new analytics dashboard"`
- `"Update: Improve performance for API calls"`
- `"Docs: Update deployment documentation"`

### 4. Push to GitHub (Triggers Vercel Deployment)

```bash
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```

**Important**: Replace `YOUR_TOKEN_HERE` with your actual GitHub personal access token. This push will automatically trigger a Vercel deployment!

---

## Authentication Details

### GitHub Personal Access Token (PAT)

**Token**: `ghp_1Lamdd...44qu` (See secure storage or password manager for full token)

**Account**: bradeyre

**Scopes**: `repo` (Full control of private repositories)

**Created**: November 1, 2025

**Expires**: December 31, 2025

**⚠️ IMPORTANT**: The full token is stored securely. Contact the repository owner or check your secure password manager for the complete token.

**Token URL Format**:
```
https://USERNAME:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git
```

### Token Management

- **Keep this token secure** - Do not share publicly or commit to public repositories
- **Token location**: This file (GIT_DEPLOYMENT_GUIDE.md)
- **Regenerate token**: If compromised, go to https://github.com/settings/tokens

### Creating a New Token (If Needed)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Platinum Repairs Deployment"
4. Select scope: **`repo`** (Full control of private repositories)
5. Click "Generate token"
6. Copy the token and update this document

---

## Alternative Push Methods

### Method 1: Configure Git Credential Helper (Recommended for Frequent Use)

Set up once, then use simple `git push`:

```bash
# Configure credential helper
git config credential.helper store

# First push will prompt for credentials
git push origin main
# Enter username: bradeyre
# Enter password: YOUR_TOKEN_HERE (your GitHub personal access token)

# Subsequent pushes won't require credentials
git push origin main
```

### Method 2: Using Git Credential Manager (Windows)

```bash
git config credential.helper manager
git push origin main
```

Windows will prompt for credentials and store them securely.

### Method 3: Direct Token in URL (Current Method)

```bash
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```

Replace `YOUR_TOKEN_HERE` with your actual GitHub personal access token.

---

## Monitoring Deployment

### 1. Check Vercel Dashboard

After pushing, monitor the deployment:
- **Vercel Dashboard**: https://vercel.com/dashboard
- Look for your latest deployment
- Check build logs for any errors

### 2. Deployment Timeline

- Push to GitHub: Immediate
- Vercel detects push: ~10-30 seconds
- Build starts: Automatic
- Build completes: ~2-5 minutes
- Live deployment: Automatic after successful build

### 3. Deployment URLs

- **Production**: https://platinumrepairs.co.za (or your Vercel URL)
- **Preview deployments**: Other branches get preview URLs
- **Deployment status**: Visible in Vercel dashboard

---

## Common Workflows

### Daily Development Workflow

```bash
# 1. Pull latest changes (if working with team)
git pull origin main

# 2. Make your code changes
# ... edit files ...

# 3. Check what changed
git status
git diff

# 4. Stage and commit
git add .
git commit -m "Your descriptive message"

# 5. Push and deploy
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main

# 6. Monitor deployment in Vercel dashboard
```

### Emergency Rollback

If a deployment breaks production:

```bash
# Option 1: Revert last commit
git revert HEAD
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main

# Option 2: Use Vercel Dashboard
# Go to Vercel → Deployments → Select previous working deployment → Promote to Production
```

### Working with Branches (Preview Deployments)

```bash
# Create and switch to new branch
git checkout -b feature-new-dashboard

# Make changes and commit
git add .
git commit -m "WIP: New dashboard design"

# Push branch (creates preview deployment)
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git feature-new-dashboard

# Vercel will create a preview URL like:
# https://platinum-repairs-git-feature-new-dashboard-bradeyre.vercel.app

# When ready, merge to main
git checkout main
git merge feature-new-dashboard
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```

---

## Troubleshooting

### Issue: Permission Denied

**Error**: `Permission to bradeyre/platinum-repairs.git denied`

**Solution**: Use the token URL format:
```bash
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```
Replace `YOUR_TOKEN_HERE` with your GitHub personal access token.

### Issue: Remote Not Found

**Error**: `fatal: 'origin' does not appear to be a git repository`

**Solution**: Add the remote:
```bash
git remote add origin https://github.com/bradeyre/platinum-repairs.git
```

### Issue: Merge Conflicts

**Error**: `CONFLICT (content): Merge conflict in file.ts`

**Solution**:
```bash
# Pull latest changes first
git pull origin main

# Resolve conflicts in your editor
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflicts"
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```

### Issue: Token Expired

**Error**: `Authentication failed` or `Bad credentials`

**Solution**: Generate new token at https://github.com/settings/tokens and update this document

### Issue: Build Failed on Vercel

**Check**:
1. Vercel dashboard → Deployment logs
2. Look for TypeScript errors
3. Check environment variables are set
4. Test build locally: `npm run build`

**Common Fixes**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build

# If build succeeds locally, push again
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main
```

---

## Best Practices

### Before Pushing

- ✅ Test locally: `npm run dev`
- ✅ Check for TypeScript errors: `npm run build`
- ✅ Review your changes: `git diff`
- ✅ Use descriptive commit messages
- ✅ Pull latest changes if working with team: `git pull origin main`

### After Pushing

- ✅ Monitor Vercel deployment dashboard
- ✅ Wait for build to complete (2-5 minutes)
- ✅ Test the live site after deployment
- ✅ Check logs for any runtime errors

### Security

- ⚠️ Never commit this token to public repositories
- ⚠️ Rotate token periodically for security
- ⚠️ Keep this document in private repository only
- ✅ Use environment variables for sensitive data in code

---

## Quick Command Reference

```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Your message"

# Push to main (triggers deployment)
git push https://bradeyre:YOUR_TOKEN_HERE@github.com/bradeyre/platinum-repairs.git main

# View commit history
git log --oneline

# Check remotes
git remote -v

# Pull latest changes
git pull origin main

# Create new branch
git checkout -b branch-name

# Switch branches
git checkout main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git restore path/to/file.ts
```

---

## Environment Variables

Remember that environment variables are set in **Vercel Dashboard**, not in code:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Required variables are documented in `ENVIRONMENT_SETUP.md`
3. After changing environment variables, trigger a redeploy in Vercel

---

## Related Documentation

- **Full Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Safe Deployment Practices**: `SAFE_DEPLOYMENT_GUIDE.md`
- **Environment Setup**: `ENVIRONMENT_SETUP.md`
- **System Architecture**: `SYSTEM_ARCHITECTURE.md`

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review this guide's troubleshooting section
3. Check GitHub repository: https://github.com/bradeyre/platinum-repairs
4. Verify token hasn't expired: https://github.com/settings/tokens

---

**Last Updated**: November 1, 2025

**Current Token Expiration**: December 31, 2025

**Note**: You will need to regenerate the token before December 31, 2025. When you do, update this document with the new token.

