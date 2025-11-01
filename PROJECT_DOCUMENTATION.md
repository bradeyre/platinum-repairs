# Platinum Repairs System - Complete Project Documentation

## 🏗️ System Overview

The Platinum Repairs system is a comprehensive repair management platform that integrates with RepairShopr APIs, Google Sheets, and provides damage report management with PDF generation capabilities.

## 🔧 Technical Stack

- **Framework**: Next.js 15.5.2 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Simple localStorage-based authentication (bypasses Supabase auth conflicts)
- **External APIs**: RepairShopr API, Google Sheets API
- **PDF Generation**: Puppeteer
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
platinum-repairs-clean/
├── app/
│   ├── api/
│   │   ├── damage-reports/          # Damage report CRUD operations
│   │   ├── google-sheets/sync/      # Google Sheets integration
│   │   ├── parts-pricing/           # Parts pricing API
│   │   ├── pdf/generate/            # PDF generation
│   │   ├── tickets/                 # Ticket management
│   │   └── ...                      # Other API endpoints
│   ├── dashboard/
│   │   ├── admin/                   # Admin dashboard
│   │   ├── claim-manager/           # Claim manager dashboard
│   │   └── technician/              # Technician dashboard
│   └── login/                       # Authentication
├── components/
│   ├── DamageReportModal.tsx        # Damage report creation
│   ├── PartsPricingModal.tsx        # Parts selection with pricing
│   ├── TicketClaimingModal.tsx      # Ticket assignment
│   └── ...                          # Other UI components
├── lib/
│   ├── auth.ts                      # Authentication utilities
│   ├── google-sheets.ts             # Google Sheets integration
│   ├── pdf-generator.ts             # PDF generation
│   ├── repairshopr-new.ts           # RepairShopr API integration
│   └── supabase.ts                  # Database client
└── ...                              # Configuration files
```

## 🔑 Environment Variables

### Required Environment Variables (Vercel Dashboard)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://hplkxqwaxpoubbmnjulo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RepairShopr API Tokens
REPAIRSHOPR_TOKEN=T0c8dba3f0694983f4-764b5c6394a4fbfc181b4aad41f567c8
REPAIRSHOPR_TOKEN_DD=T1061bd85843359e0e-7b4026074327cf4d3e0e0d018f8ba88f

# Google Sheets Integration (for parts pricing)
# No credentials needed - uses public CSV export
# Sheet: https://docs.google.com/spreadsheets/d/1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE/edit?usp=sharing

# App Configuration
NEXT_PUBLIC_APP_URL=https://platinumrepairs.co.za
ENABLE_REALTIME_SYNC=true
```

## 🗄️ Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'claim_manager')),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### parts_pricing
```sql
CREATE TABLE parts_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_type TEXT NOT NULL,
  price_zar DECIMAL(10,2) NOT NULL,
  eta_days INTEGER DEFAULT 1,
  stock_status TEXT DEFAULT 'available',
  sheet_row_number INTEGER,
  sheet_col_number INTEGER,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(part_name, device_brand, device_model)
);
```

#### damage_reports
```sql
CREATE TABLE damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dr_number TEXT UNIQUE NOT NULL,
  claim_number TEXT,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_type TEXT NOT NULL,
  imei_serial TEXT,
  storage_capacity TEXT,
  color TEXT,
  client_reported_issues TEXT[] DEFAULT '{}',
  tech_findings TEXT[] DEFAULT '{}',
  damage_photos TEXT[] DEFAULT '{}',
  tech_ber_suggestion BOOLEAN,
  manager_ber_decision BOOLEAN,
  ber_reason TEXT,
  selected_parts JSONB DEFAULT '{}',
  total_parts_cost DECIMAL(10,2) DEFAULT 0,
  final_eta_days INTEGER,
  manager_notes TEXT,
  ai_checklist TEXT[],
  ai_risk_assessment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_assessment', 'awaiting_approval', 
    'in_repair', 'quality_check', 'completed', 'ber_confirmed', 'cancelled'
  )),
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  assigned_tech_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ticket_wait_times
```sql
CREATE TABLE ticket_wait_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  technician_id TEXT,
  wait_time_hours DECIMAL(10,2) NOT NULL,
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ticket_wait_times_technician ON ticket_wait_times (technician_id);
CREATE INDEX idx_ticket_wait_times_completed_at ON ticket_wait_times (completed_at);
CREATE INDEX idx_ticket_wait_times_ticket_id ON ticket_wait_times (ticket_id);
```

#### technician_performance
```sql
CREATE TABLE technician_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_tickets_completed INTEGER DEFAULT 0,
  average_wait_time_hours DECIMAL(10,2) DEFAULT 0,
  total_work_hours DECIMAL(10,2) DEFAULT 0,
  efficiency_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(technician_id, date)
);

-- Indexes for performance
CREATE INDEX idx_technician_performance_technician ON technician_performance (technician_id);
CREATE INDEX idx_technician_performance_date ON technician_performance (date);
```

## 🔌 API Integration

### RepairShopr API

#### Platinum Repairs
- **URL**: `https://platinumrepairs.repairshopr.com/api/v1/tickets`
- **Token**: `REPAIRSHOPR_TOKEN`
- **Purpose**: Fetches tickets from Platinum Repairs
- **Tag Color**: Blue "PR" tags

#### Device Doctor
- **URL**: `https://devicedoctorsa.repairshopr.com/api/v1/tickets`
- **Token**: `REPAIRSHOPR_TOKEN_DD`
- **Purpose**: Fetches tickets from Device Doctor
- **Tag Color**: Green "DD" tags

### Google Sheets Integration

#### Sheet Configuration
- **Sheet ID**: `1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE`
- **Shared Link**: [https://docs.google.com/spreadsheets/d/1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE/edit?usp=sharing)
- **Range**: `Sheet1!A:M`
- **Purpose**: Parts pricing data sync
- **Access**: Public CSV export (no authentication required)

#### Sheet Structure
```
Column A: iPhone Model    | Column B: Part Name      | Column D: Insurance | Column E: ETA      | Column M: Replacement Value
iPhone SE (2020)         | Screen Assembly          | R1,499.00          | Next day          | R5,000.00
iPhone SE (2020)         | Casing                   | R2,199.00          | Next day          | R5,000.00
iPhone SE (2020)         | Battery (Generic)        | R899.00            | Next day          | R5,000.00
iPhone SE (2022)         | Screen Assembly          | R3,999.00          | Next day          | 
iPhone 6                 | Screen Assembly          | R579.00            | Next day          | R2,000.00
```

## 🎯 Key Features

### 1. Ticket Management
- **Dual API Integration**: Fetches from both Platinum Repairs and Device Doctor
- **Status Filtering**: Only shows 5 specific statuses
- **Workshop Filtering**: Excludes certain workshop assignments
- **Real-time Updates**: Polls every 1 minute
- **Technician Assignment**: One-click ticket claiming

### 2. Damage Reports
- **Creation**: Technicians can create detailed damage reports
- **Approval Workflow**: Claim managers can approve/reject reports
- **PDF Generation**: Professional PDFs with company branding
- **Parts Integration**: Select parts with real-time pricing

### 3. Parts Pricing
- **Google Sheets Sync**: Automatic sync from live Google Sheet
- **Search & Filter**: Find parts by brand, model, or search term
- **Cost Calculation**: Automatic total cost calculation
- **ETA Tracking**: Delivery time estimates

### 4. User Management
- **Role-based Access**: Admin, Technician, Claim Manager roles
- **Authentication**: Simple localStorage-based authentication via `/api/simple-auth`
- **Admin Impersonation**: Admins can select technicians to view their tickets
- **User Profiles**: Bio and profile management

### 5. AI-Powered Device Detection & Analysis
- **OpenAI Integration**: Uses GPT-3.5-turbo for intelligent device name extraction and analysis
- **Context Analysis**: Analyzes full ticket data (subject, customer, notes) for better detection
- **Device Details Extraction**: AI extracts make, model, device type, and IMEI numbers from ticket descriptions
- **Device Type Detection**: Automatically detects device type (Phone, Laptop, Tablet, Watch, Desktop) with comprehensive rules
- **Dynamic Issue Detection**: Creates checkboxes for specific issues mentioned by clients
- **Confidence Scoring**: Only uses AI results with >60% confidence
- **Fallback Patterns**: Regex-based fallback for low-confidence cases
- **Caching**: LRU cache prevents repeated API calls for same descriptions
- **Real-time Processing**: Device names and analysis updated automatically as tickets are processed
- **IMEI Validation**: Integrated IMEI checker button for device verification
- **Comprehensive Device Rules**: Covers all major device types (MacBook, ThinkPad, iPhone, Galaxy, iPad, etc.)

### 6. Ticket Details & Claim Number Extraction
- **API Integration**: `/api/ticket-details` endpoint fetches individual ticket data
- **Ticket Search**: Searches by ticket number (e.g., 89756) instead of internal RepairShopr ID
- **Properties Extraction**: Extracts claim numbers from `ticket.properties["Claim #"]`
- **Comments Fallback**: Searches ticket comments if claim number not found in properties
- **Real-time Updates**: Automatically populates form fields when data is found
- **Error Handling**: Graceful fallback if API calls fail
- **Complete Data Access**: Returns full ticket data including comments and properties

### 7. Comprehensive Damage Report Modal
- **Timer-Based Workflow**: All form fields disabled until timer starts
- **Auto-Population**: AI extracts claim number, make, model, and IMEI from ticket data
- **Device-Specific Parts**: Dynamic parts lists based on device type (phone, laptop, tablet, watch)
- **Photo Validation**: Requires 2-6 photos with visual feedback
- **IMEI Checker Integration**: One-click IMEI validation via external service
- **Dynamic Issue Checkboxes**: AI-generated checkboxes for specific issues to verify
- **Repairability Assessment**: Checkbox for device repairability with explanation field
- **Complete Button**: Validates all requirements and saves to database
- **Real-time Validation**: Form validation with user feedback

### 8. Performance Tracking
- **Status-Based Timing**: Measures wait time from when ticket status changes, not ticket creation
- **Business Hours Only**: Only counts 8 AM - 6 PM, Monday-Friday (excludes weekends and after-hours)
- **Real-Time Updates**: Time display updates automatically as tickets move through statuses
- **Wait Time Recording**: Automatically records wait times when techs start working (status changes to "In Progress" or "Troubleshooting")
- **Efficiency Scoring**: 0-100 score based on average wait times
- **Performance Grades**: Excellent (<2h), Good (2-4h), Average (4-8h), Needs Improvement (>8h)
- **Department Metrics**: Overall team performance and trends
- **Individual Stats**: Per-technician performance tracking

### 9. Recent System Improvements & Fixes

#### AI Device Type Detection ✅
- **Enhanced AI Analysis**: The AI analysis now consistently extracts `deviceType` (Phone, Laptop, Tablet, Watch, Desktop) from ticket descriptions
- **Comprehensive Detection Rules**: Added specific keyword mapping for device type identification
- **Improved Accuracy**: AI prompt updated to be more explicit about required JSON structure
- **Required Field Validation**: Made deviceType field mandatory in AI responses

#### Damage Report Validation ✅
- **Required Field Validation**: Damage reports cannot be completed unless all checked issues have corresponding comments
- **Photo Validation**: Enforced minimum 2 and maximum 6 photos per damage report
- **UI Lockout**: All form fields (including textareas) are disabled until the timer is started
- **Real-time Form Updates**: Form fields now update automatically when AI analysis completes

#### Database Schema Alignment ✅
- **Corrected Field Mapping**: Updated damage reports API to use actual Supabase database schema
- **Removed Non-existent Fields**: Eliminated references to `report_data` JSONB field that doesn't exist
- **Added Missing Fields**: Included all required fields for Claim Manager functionality
- **Error Handling**: Improved error handling for damage report saving

#### RepairShopr Integration ✅ VERIFIED WORKING
- **Status Updates**: Damage reports now automatically update RepairShopr ticket status to "Damage Report Completed"
- **Ticket Filtering**: Completed damage reports are properly filtered out from technician view
- **API Reliability**: Enhanced error handling and logging for RepairShopr API calls
- **Direct API Testing**: Confirmed RepairShopr API token is valid and status updates work correctly
- **Real-time Verification**: Tested ticket #89079 successfully updated from "Awaiting Damage Report" to "Damage Report Completed"

#### UI/UX Improvements ✅
- **Complete UI Lockout**: All form fields (including textareas) are disabled until timer is started
- **Claim Manager Navigation**: Fixed redirect issues and added proper role switching
- **Enhanced Logging**: Added detailed console logging for debugging RepairShopr status updates
- **Removed Distracting Elements**: Eliminated timer pop-ups and improved form validation
- **Claim Number Extraction**: Enhanced claim number extraction from ticket properties and comments

## 🔄 RepairShopr Status Update System

### Automatic Status Updates ✅ VERIFIED WORKING
The system automatically updates RepairShopr ticket status when damage reports are completed:

- **Trigger**: When a damage report is saved with `status: 'completed'`
- **Action**: RepairShopr ticket status is updated to "Damage Report Completed"
- **API Method**: Uses RepairShopr PUT API (`/api/v1/tickets/{id}`)
- **Error Handling**: Comprehensive logging and error handling
- **Verification**: Real-time testing confirmed working (ticket #89079)

### Technical Implementation
```typescript
// In /api/damage-reports/route.ts
if (status === 'completed' && finalTicketId) {
  const ticketNumber = finalTicketId.replace('#', '')
  const ticketType = finalTicketId.includes('PR') ? 'PR' : 'DD'
  
  const updateSuccess = await updateRepairShoprTicketStatus(
    ticketNumber, 
    ticketType, 
    'Damage Report Completed'
  )
}
```

### Benefits
- **Automatic Workflow**: No manual status updates required
- **Real-time Sync**: Changes immediately reflected in RepairShopr
- **Ticket Filtering**: Completed tickets automatically removed from technician view
- **Audit Trail**: Full logging of all status update attempts

## 🚀 Deployment Process

### 1. Prerequisites
- Vercel account
- Supabase project
- Google Cloud project with Sheets API
- RepairShopr API access

### 2. Setup Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/bradeyre/platinum-repairs.git
   cd platinum-repairs
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Environment Variables**:
   - Add all required variables to Vercel dashboard
   - Test with debug endpoints

4. **Deploy**:
   ```bash
   git push origin main
   ```

### 3. Post-Deployment

1. **Test APIs**:
   ```bash
   curl https://your-app.vercel.app/api/test-apis
   curl -X POST https://your-app.vercel.app/api/google-sheets/sync
   ```

2. **Setup Users**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/setup-users
   ```

3. **Verify Functionality**:
   - Test all dashboard routes
   - Verify ticket filtering
   - Test damage report creation
   - Check PDF generation

## 👥 User Accounts

### Admin Users
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| brad | b123456 | admin | Brad | brad@platinumrepairs.co.za |
| andre | a123456 | admin | Andre | andre@platinumrepairs.co.za |
| celeste | c123456 | admin | Celeste | celeste@platinumrepairs.co.za |
| braam | b123456 | admin | Braam | braam@platinumrepairs.co.za |
| melany | m123456 | admin | Melany | melany@platinumrepairs.co.za |

### Claim Managers
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| janine | j123456 | claim_manager | Janine | janine@platinumrepairs.co.za |
| dane | d123456 | claim_manager | Dane | dane@platinumrepairs.co.za |
| derilise | d123456 | claim_manager | Derilise | derilise@platinumrepairs.co.za |

### Technicians
| Username | Password | Role | Full Name | Email |
|----------|----------|------|-----------|-------|
| ben | b123456 | technician | Ben | ben@platinumrepairs.co.za |
| marshal | m123456 | technician | Marshal | marshal@platinumrepairs.co.za |
| malvin | m123456 | technician | Malvin | malvin@platinumrepairs.co.za |
| francis | f123456 | technician | Francis | francis@platinumrepairs.co.za |

## 🔍 API Endpoints

### Core APIs
- `GET /api/tickets` - Main tickets endpoint
- `POST /api/tickets/assign` - Assign tickets to technicians
- `GET /api/test-apis` - Debug endpoint for API testing

### Damage Reports
- `GET /api/damage-reports` - Get all damage reports
- `POST /api/damage-reports` - Create damage report
- `POST /api/damage-reports/[id]/approve` - Approve report
- `POST /api/damage-reports/[id]/reject` - Reject report

### Parts Pricing
- `GET /api/parts-pricing` - Get parts with filtering
- `POST /api/google-sheets/sync` - Sync from Google Sheets

### PDF Generation
- `GET /api/pdf/generate?id=[reportId]` - Generate PDF
- `POST /api/pdf/generate` - Generate PDF (POST method)

### User Management
- `POST /api/setup-users` - Setup system users
- `POST /api/cleanup-users` - Remove all users

### AI Analysis
- `POST /api/ai-analyze-ticket` - Analyze ticket descriptions and extract device details

### Performance Tracking
- `POST /api/ticket-status-tracking` - Record status changes and wait times
- `GET /api/performance-analytics` - Get comprehensive performance metrics

## 🧪 Testing

### Automated Testing
```bash
# Test main application
curl -s -o /dev/null -w "%{http_code}" "https://platinum-repairs.vercel.app/"

# Test API endpoints
curl -s -o /dev/null -w "%{http_code}" "https://platinum-repairs.vercel.app/api/tickets"
curl -s -o /dev/null -w "%{http_code}" "https://platinum-repairs.vercel.app/api/test-apis"

# Test Google Sheets sync
curl -X POST "https://platinum-repairs.vercel.app/api/google-sheets/sync"
```

### Manual Testing Checklist
- [ ] Admin dashboard loads correctly
- [ ] Technician dashboard shows selector modal
- [ ] Can select technician and see assigned tickets
- [ ] Claim tickets functionality works
- [ ] Both PR (blue) and DD (green) tickets visible
- [ ] Only 5 allowed statuses displayed
- [ ] Damage report creation works
- [ ] PDF generation works
- [ ] Parts pricing sync works
- [ ] User authentication works

## 🚨 Troubleshooting

### Common Issues

1. **No DD Tickets Showing**:
   - Check `REPAIRSHOPR_TOKEN_DD` environment variable
   - Verify Device Doctor URL is correct
   - Test with `/api/test-apis` endpoint

2. **Google Sheets Sync Failing**:
   - Verify Google Sheets credentials
   - Check sheet sharing permissions
   - Test with `/api/google-sheets/sync` endpoint

3. **PDF Generation Errors**:
   - Check Puppeteer installation
   - Verify damage report data exists
   - Check server logs for errors

4. **Authentication Issues**:
   - Verify Supabase configuration
   - Check user setup with `/api/setup-users`
   - Verify role assignments

### Debug Commands
```bash
# Check environment variables
curl https://your-app.vercel.app/api/debug-env

# Test all APIs
curl https://your-app.vercel.app/api/test-apis

# Check ticket filtering
curl https://your-app.vercel.app/api/test-filtered-tickets

# Test Google Sheets
curl -X POST https://your-app.vercel.app/api/google-sheets/sync
```

## 📚 Documentation Files

- `BUILD_DOCUMENTATION.md` - Build and deployment guide
- `GOOGLE_SHEETS_INTEGRATION.md` - Google Sheets integration details
- `API_DOCUMENTATION.md` - API filtering rules and documentation
- `PROJECT_DOCUMENTATION.md` - This comprehensive guide

## 🔄 Maintenance

### Regular Tasks
1. **Monitor API Quotas**: Check RepairShopr and Google Sheets API usage
2. **Update Dependencies**: Keep npm packages updated
3. **Backup Data**: Regular exports of critical data
4. **Performance Monitoring**: Check response times and error rates

### Updates
1. **Code Changes**: Always test locally before deploying
2. **Environment Variables**: Document any new variables needed
3. **Database Changes**: Update schema documentation
4. **API Changes**: Update integration documentation

## 📞 Support

For technical support:
1. Check this documentation first
2. Review error logs in Vercel dashboard
3. Test with debug endpoints
4. Check environment variables
5. Verify external API access

---

**Last Updated**: Current Session
**Version**: 2.0
**Status**: ✅ Complete and Production Ready
**Deployment**: https://platinum-repairs.vercel.app


## 📊 Latest System Enhancements (December 2024)

### Client Data Integration
- **Automatic Client Name Extraction**: System now pulls client name directly from RepairShopr tickets
- **Enhanced Claim Number Detection**: Improved extraction from ticket properties and comments
- **Complete Data Flow**: Client information flows seamlessly from ticket → damage report → PDF
- **Database Storage**: Client name and claim number saved in damage_reports table

### Professional PDF Generation
- **Insurance-Friendly Layout**: Two-column professional design optimized for insurance managers
- **Comprehensive Information**: All key data on first page (claim info, device details, technician info, parts & pricing)
- **Smart Page Breaks**: Text content on page 1, damage photos on subsequent pages
- **Enhanced Parts Display**: "Parts Needed" section with detailed pricing and VAT calculations
- **Technician Information**: Full technician name and bio prominently displayed

### Data Persistence Improvements
- **Complete Form State**: All form data (replacement value, notes, parts) now persists when reopening reports
- **Enhanced Parts Storage**: Detailed parts information saved for accurate reconstruction
- **Manager Workflow**: Save Decision → Generate PDF → Complete workflow with full data preservation
