# Platinum Repairs - System Architecture Reference

## Overview
Platinum Repairs TechDash 2.0 is a comprehensive repair management system that integrates with RepairShopr APIs, Google Sheets, and provides AI-powered features for damage assessment and repair tracking.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.2 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.3.0
- **UI Components**: Custom components with Radix UI primitives
- **State Management**: React hooks (useState, useEffect)
- **Forms**: React Hook Form 7.50.1

### Backend
- **Runtime**: Node.js (Vercel serverless functions)
- **API Routes**: Next.js API routes (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom localStorage-based auth (bypasses Supabase auth)

### External Integrations
- **RepairShopr API**: Dual instance integration (Platinum Repairs + Device Doctor)
- **Google Sheets API**: Parts pricing sync (googleapis 159.0.0)
- **OpenAI API**: AI-powered device detection and analysis (openai 5.20.0)
- **PDF Generation**: Puppeteer 22.4.1

### Deployment
- **Platform**: Vercel
- **Git**: GitHub (https://github.com/bradeyre/platinum-repairs.git)
- **Domain**: https://platinumrepairs.co.za
- **Auto-deploy**: Enabled on push to main branch

## Architecture Layers

### 1. Presentation Layer (Client Components)
```
app/
├── dashboard/
│   ├── admin/page.tsx           # Admin dashboard
│   ├── technician/page.tsx      # Technician dashboard
│   └── claim-manager/page.tsx   # Claim manager dashboard
├── login/page.tsx               # Authentication page
└── layout.tsx                   # Root layout
```

### 2. API Layer (Server-Side)
```
app/api/
├── tickets/                     # Ticket management
│   ├── route.ts                 # GET tickets, POST assign
│   └── assign/route.ts          # Ticket assignment
├── damage-reports/              # Damage report CRUD
│   ├── route.ts                 # GET/POST damage reports
│   └── [id]/                    # Individual report operations
├── repair-completions/          # Repair completion tracking
├── repair-archive/              # Completed repairs archive
├── parts-pricing/               # Google Sheets parts data
├── google-sheets/sync/          # Sync parts from sheets
├── ai-analyze-ticket/           # AI device detection
├── ai-repair-analysis/          # AI repair assistance
├── technicians/                 # Technician management
└── simple-auth/                 # Authentication
```

### 3. Business Logic Layer
```
lib/
├── repairshopr-new.ts          # RepairShopr API integration
├── supabase.ts                  # Database client
├── auth.ts                      # Authentication utilities
├── google-sheets.ts             # Google Sheets integration
├── device-detection.ts          # AI device detection
├── pdf-generator.ts             # PDF generation
└── performance.ts               # Performance tracking
```

### 4. Data Layer
- **Supabase PostgreSQL**: Primary database
- **RepairShopr API**: External ticket source
- **Google Sheets**: Parts pricing data source
- **localStorage**: Session management (no server-side sessions)

## Data Flow

### Ticket Management Flow
```
RepairShopr APIs (PR + DD)
    ↓
/api/tickets (fetch & filter)
    ↓
lib/repairshopr-new.ts (process & map)
    ↓
Dashboard Components (display)
    ↓
User Actions (claim, assign)
    ↓
/api/tickets/assign (update)
    ↓
RepairShopr API (sync back)
```

### Damage Report Flow
```
Technician Dashboard
    ↓
DamageReportModal Component
    ↓
AI Analysis (/api/ai-analyze-ticket)
    ↓
Photo Upload (base64 encoding)
    ↓
/api/damage-reports (save to Supabase)
    ↓
RepairShopr Status Update
    ↓
Claim Manager Review
```

### Repair Completion Flow
```
Technician Dashboard
    ↓
RepairCompletionModal Component
    ↓
AI Repair Checklist (/api/ai-repair-checklist)
    ↓
Photo Documentation (2-6 photos)
    ↓
/api/repair-completions (save)
    ↓
RepairShopr Status Update ("Repair Completed")
    ↓
/api/repair-archive (archive)
```

## Authentication & Authorization

### Authentication Method
- **Type**: Custom localStorage-based (no JWT, no server sessions)
- **Endpoint**: `/api/simple-auth`
- **Storage**: `localStorage.currentUser`
- **Persistence**: Session-only (cleared on browser close)

### User Roles
1. **Admin**: Full system access, can impersonate technicians
2. **Technician**: Access to assigned tickets, damage reports, repair completion
3. **Claim Manager**: Review damage reports, make BER decisions

### Role-Based Access
```typescript
// Admin Dashboard
if (user.role !== 'admin') router.push('/login')

// Technician Dashboard
if (user.role !== 'technician' && user.role !== 'admin') router.push('/login')

// Claim Manager Dashboard
if (user.role !== 'claim_manager' && user.role !== 'admin') router.push('/login')
```

## API Integration Details

### RepairShopr Integration
- **Platinum Repairs**: https://platinumrepairs.repairshopr.com/api/v1
- **Device Doctor**: https://devicedoctorsa.repairshopr.com/api/v1
- **Authentication**: API key in query parameter (`?api_key=TOKEN`)
- **Method**: Multiple parallel calls (7 statuses × 2 instances = 14 calls)
- **Filtering**: Server-side by status, client-side by technician/workshop

### Google Sheets Integration
- **Method**: Public CSV export (no authentication)
- **Sheet ID**: 1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE
- **Sync**: Manual trigger via `/api/google-sheets/sync`
- **Structure**: Vertical layout (device model, part name, prices)

### OpenAI Integration
- **Model**: GPT-3.5-turbo
- **Use Cases**:
  - Device detection from ticket descriptions
  - Serial number extraction
  - Repair analysis and recommendations
  - Smart repair checklists
- **Caching**: LRU cache to prevent duplicate API calls

## Database Schema

### Core Tables
1. **users**: User accounts and roles
2. **parts_pricing**: Synced from Google Sheets
3. **damage_reports**: Damage assessment records
4. **repair_completions**: Completed repair records
5. **repair_photos**: Photo storage (base64)
6. **ticket_wait_times**: Performance tracking
7. **technician_performance**: Daily performance metrics
8. **time_tracking**: Work hour tracking

### Key Relationships
```
users (1) → (N) damage_reports
users (1) → (N) repair_completions
damage_reports (1) → (N) repair_photos
repair_completions (1) → (N) repair_photos
```

## Performance Considerations

### Optimization Strategies
1. **Parallel API Calls**: All RepairShopr calls execute simultaneously
2. **Server-Side Filtering**: Status filtering at API level
3. **Background Refresh**: 30-60 second intervals without loading screens
4. **Business Hours Calculation**: Only count 8 AM - 6 PM, Mon-Fri
5. **Base64 Photo Storage**: Eliminates file upload complexity

### Caching Strategy
- **AI Device Detection**: LRU cache for repeated descriptions
- **Parts Pricing**: Database cache, manual sync trigger
- **Tickets**: No caching, always fetch fresh data

## Security Considerations

### Current Implementation
- ⚠️ **Hardcoded credentials in code** (supabase.ts) - Should use env vars
- ✅ **No sensitive data in localStorage** - Session-only
- ✅ **Row Level Security (RLS)** on Supabase tables
- ✅ **API key authentication** for RepairShopr
- ⚠️ **No rate limiting** on API endpoints

### Recommendations
1. Move hardcoded Supabase credentials to environment variables
2. Implement rate limiting on public API endpoints
3. Add request validation and sanitization
4. Implement proper session management
5. Add audit logging for sensitive operations

## Deployment Architecture

### Vercel Deployment
```
GitHub Repository (main branch)
    ↓ (automatic trigger on push)
Vercel Build Process
    ↓
- npm install
- npm run build (Next.js build)
- Deploy to Vercel Edge Network
    ↓
Live Site: https://platinumrepairs.co.za
```

### Environment Variables (Vercel Dashboard)
- Set in: Project Settings → Environment Variables
- Scope: Production, Preview, Development
- Required: See ENVIRONMENT_SETUP.md

### Database (Supabase)
- **Hosting**: Supabase Cloud
- **Region**: Auto-selected
- **Backups**: Automatic daily backups
- **Connection**: Direct from Vercel serverless functions

## Monitoring & Debugging

### Debug Endpoints
- `/api/test-apis` - Test both RepairShopr APIs
- `/api/test-filtered-tickets` - Analyze filtering results
- `/api/debug-dd-filtered` - Device Doctor specific analysis
- `/api/test-env` - Check environment variables

### Logging Strategy
- **Client-Side**: console.log with emoji prefixes (🔍, ✅, ❌, ⚠️)
- **Server-Side**: console.log in API routes
- **Vercel Logs**: Available in Vercel dashboard

### Error Handling
- Try-catch blocks in all async operations
- Graceful degradation (e.g., AI fails → fallback to regex)
- User-friendly error messages
- Background operations don't disrupt UI

## Scalability Considerations

### Current Limitations
1. **API Call Volume**: 14 parallel calls every refresh (1-5 minutes)
2. **Photo Storage**: Base64 in database (not ideal for large scale)
3. **No Pagination**: Loads all active tickets at once
4. **Synchronous Processing**: No background job queue

### Future Improvements
1. Implement caching layer (Redis)
2. Move to object storage for photos (S3, Cloudflare R2)
3. Add pagination for large ticket lists
4. Implement background job queue (Bull, BullMQ)
5. Add database connection pooling
6. Implement WebSocket for real-time updates

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Create .env.local with required variables
# (see ENVIRONMENT_SETUP.md)

# Run development server
npm run dev

# Access at http://localhost:3000
```

### Deployment Workflow
```bash
# Make changes in code
git add .
git commit -m "Description of changes"
git push origin main

# Vercel automatically deploys
# Monitor at https://vercel.com/dashboard
```

### Testing Strategy
- Manual testing via debug endpoints
- Browser console logging
- Vercel deployment logs
- No automated tests currently implemented

## Key Design Decisions

### Why localStorage for Auth?
- Avoids Supabase auth conflicts
- Simpler implementation
- Session-only (no persistent login)
- Suitable for internal tool

### Why Base64 for Photos?
- Eliminates file upload complexity
- No separate storage service needed
- Simplifies backup/restore
- Trade-off: Database size increase

### Why Multiple API Calls?
- RepairShopr doesn't support complex filtering
- Server-side status filtering more efficient
- Parallel execution keeps response time low
- Allows precise control over data fetched

### Why Google Sheets for Parts?
- Non-technical staff can update pricing
- No admin interface needed
- CSV export is simple and reliable
- Real-time updates when synced

## Conclusion

This architecture prioritizes:
1. **Simplicity**: Minimal dependencies, straightforward data flow
2. **Reliability**: Graceful degradation, error handling
3. **Performance**: Parallel API calls, background refresh
4. **Maintainability**: Clear separation of concerns, well-documented

The system is production-ready but has room for optimization as scale increases.

