# Platinum Repairs - Feature Overview

## System Purpose

Platinum Repairs TechDash 2.0 is a comprehensive repair management system designed to streamline the workflow for repair technicians, claim managers, and administrators. It integrates with RepairShopr (two instances), Google Sheets, and uses AI to enhance productivity.

## Core Features

### 1. Dual RepairShopr Integration

**Purpose**: Fetch and manage tickets from two separate RepairShopr instances

**Details**:
- **Platinum Repairs (PR)**: Main repair shop tickets
- **Device Doctor (DD)**: Secondary repair shop tickets
- **Real-time Sync**: Fetches tickets every 1-5 minutes
- **Status Filtering**: Only shows 8 active statuses:
  - Awaiting Rework
  - Awaiting Workshop Repairs
  - Awaiting Damage Report
  - Awaiting Repair
  - In Progress
  - Troubleshooting
  - Awaiting Walk-in Repair
  - Awaiting Walk-in DR

**Technician Filtering**:
- **Included**: Marshal, Malvin, Francis, Ben, Thasveer, Shannon, Reece
- **Workshop Mapping**: 
  - Durban Workshop → Thasveer
  - Cape Town Workshop → Reece

**Implementation**: `lib/repairshopr-new.ts`, `/api/tickets`

### 2. Role-Based Dashboards

#### Admin Dashboard (`/dashboard/admin`)

**Features**:
- View all tickets from both PR and DD
- Assign tickets to technicians
- Monitor technician performance
- Access comprehensive analytics
- Manage technician accounts
- View repair archive
- Track active minutes

**Key Metrics**:
- Total tickets
- Waiting tickets
- Completed today
- Overdue tickets
- Clocked-in technicians
- Average wait time

**Tabs**:
1. RepairShopr Tickets - Full ticket list with assignment
2. Comprehensive Analytics - Detailed performance metrics
3. Analytics Dashboard - Consolidated analytics
4. Deep Analytics Report - In-depth analysis
5. Active Minutes Tracker - Real-time activity monitoring
6. Repair Archive - Completed repairs history
7. Technician Management - Add/edit technicians

#### Technician Dashboard (`/dashboard/technician`)

**Features**:
- View assigned tickets
- Claim unassigned tickets
- Create damage reports
- Complete repairs with photo documentation
- AI-powered repair assistance
- Timer-based work tracking
- Mobile-optimized interface

**Workflow**:
1. Login → Auto clock-in
2. View assigned tickets
3. Claim new tickets (if needed)
4. Start work on ticket
5. Complete damage report (if required)
6. Complete repair with photos
7. Submit → Auto-updates RepairShopr

**Mobile Optimization**:
- Card-based layout on mobile
- Touch-friendly buttons
- Simplified navigation
- Responsive design

#### Claim Manager Dashboard (`/dashboard/claim-manager`)

**Features**:
- Review damage reports
- Make BER (Beyond Economic Repair) decisions
- Select parts from Google Sheets pricing
- Calculate repair costs vs replacement value
- Generate PDF reports
- Approve/reject repairs
- Set ETAs for custom parts

**Workflow**:
1. View pending damage reports (cards)
2. Click report → Open detailed modal
3. Review photos and technician assessment
4. Select parts needed
5. Review AI analysis
6. Make BER decision (repairable vs replace)
7. Generate PDF for insurance
8. Complete report → Updates RepairShopr

### 3. Damage Report System

**Purpose**: Comprehensive damage assessment with AI assistance

**Features**:
- **Photo Upload**: 2-6 photos required (base64 storage)
- **AI Device Detection**: Automatically identifies device from ticket
- **Claim Number Extraction**: Pulls from RepairShopr custom fields
- **IMEI Checker**: One-click IMEI validation
- **Dynamic Issue Checkboxes**: AI-generated based on client complaints
- **Repairability Assessment**: Technician suggests BER or repairable
- **Timer Integration**: Tracks time spent on assessment
- **Business Hours Calculation**: Only counts 8 AM - 6 PM, Mon-Fri

**AI Features**:
- Device make/model detection
- Serial number extraction
- Issue identification
- Repair complexity assessment

**Implementation**: 
- Component: `components/DamageReportModal.tsx`
- API: `/api/damage-reports`
- AI: `/api/ai-analyze-ticket`

### 4. Repair Completion System

**Purpose**: Document completed repairs with photos and checklists

**Features**:
- **Photo Documentation**: 2-6 photos of completed repair
- **AI Repair Checklist**: Smart checklist based on device and issue
- **Work Completed**: Detailed description
- **Parts Used**: List of parts
- **Testing Results**: Quality assurance confirmation
- **Time Tracking**: Duration of repair
- **Automatic Status Update**: Sets RepairShopr status to "Repair Completed"

**AI Features**:
- Smart repair checklist generation
- Repair analysis and recommendations
- Quality scoring

**Implementation**:
- Component: `components/RepairCompletionModal.tsx`
- API: `/api/repair-completions`
- AI: `/api/ai-repair-checklist`, `/api/ai-repair-analysis`

### 5. Repair Archive System

**Purpose**: Historical record of all completed repairs

**Features**:
- **Advanced Search**: Search by ticket number, work completed, parts
- **Filtering**: By technician, date range, status
- **Pagination**: Handle large datasets efficiently
- **Detailed View**: Click to see full repair details
- **Photo Access**: View all repair photos
- **AI Analysis**: Review AI-generated checklists and analysis
- **Performance Tracking**: Technician efficiency metrics

**Access**: `/dashboard/admin/repair-archive`

**Implementation**: `/api/repair-archive`

### 6. Google Sheets Parts Pricing Integration

**Purpose**: Real-time parts pricing from editable Google Sheet

**Features**:
- **Public CSV Export**: No authentication needed
- **Vertical Structure**: Device model, part name, prices
- **Multiple Price Tiers**: Insurance, Retail 1yr, 2yr, Lifetime
- **Replacement Values**: Device replacement costs
- **ETA Information**: Parts availability
- **Search & Filter**: By brand, model, part name
- **Manual Sync**: Trigger via `/api/google-sheets/sync`

**Sheet Structure**:
```
Column A: Device Model (iPhone SE 2020)
Column B: Part Name (Screen Assembly)
Column D: Insurance Price (R1,499.00)
Column E: ETA (Next day)
Column M: Replacement Value (R5,000.00)
```

**Implementation**: 
- Library: `lib/google-sheets.ts`
- API: `/api/google-sheets/sync`, `/api/parts-pricing`
- Component: `components/PartsPricingModal.tsx`

### 7. AI-Powered Features

#### Device Detection
- **Input**: Ticket description/subject
- **Output**: Make, model, device type, IMEI
- **Confidence Scoring**: Only uses results >60% confidence
- **Caching**: LRU cache prevents duplicate API calls
- **Fallback**: Regex patterns for low confidence

#### Repair Analysis
- **Input**: Device info, issue description
- **Output**: Repair recommendations, complexity, estimated time
- **Safety Warnings**: Identifies potential hazards
- **Parts Suggestions**: Likely parts needed

#### Smart Checklists
- **Input**: Device type, repair type
- **Output**: Step-by-step repair checklist
- **Testing Procedures**: Quality assurance steps
- **Device-Specific**: Tailored to specific device

**Implementation**:
- Device Detection: `/api/ai-analyze-ticket`
- Repair Analysis: `/api/ai-repair-analysis`
- Checklists: `/api/ai-repair-checklist`
- Model: GPT-3.5-turbo

### 8. Performance Tracking

**Purpose**: Monitor technician efficiency and productivity

**Features**:
- **Wait Time Tracking**: Business hours only (8 AM - 6 PM, Mon-Fri)
- **Status-Based Timing**: Measures from status change, not ticket creation
- **Efficiency Scoring**: 0-100% based on average wait times
- **Performance Grades**: Excellent, Good, Average, Needs Improvement
- **Department Metrics**: Overall team performance
- **Individual Stats**: Per-technician tracking
- **Real-Time Alerts**: Critical and warning alerts

**Metrics**:
- Average wait time per technician
- Tickets completed per day/week/month
- Hours worked per day/week/month
- Efficiency score
- Overdue tickets

**Implementation**: 
- API: `/api/performance-analytics`, `/api/ticket-status-tracking`
- Components: `components/PerformanceLeaderboard.tsx`, `components/PerformanceMonitoring.tsx`

### 9. Time Tracking System

**Purpose**: Track actual work hours and productivity

**Features**:
- **Clock In/Out**: Manual or automatic on login
- **Session Tracking**: Start, pause, resume, complete
- **Productivity Metrics**: Daily, weekly, monthly hours
- **Active Minutes**: Real-time activity tracking
- **Efficiency Insights**: Average time per ticket
- **Performance Recommendations**: AI-generated insights

**Implementation**:
- API: `/api/time-tracking`, `/api/technician-active-minutes`
- Component: `components/ActiveMinutesTracker.tsx`, `components/EnhancedTimeTracking.tsx`

### 10. Analytics & Reporting

#### Comprehensive Analytics
- **Ticket Lifecycle**: Status transitions over time
- **Technician Performance**: Individual and team metrics
- **Wait Time Analysis**: By status and technician
- **Completion Rates**: Daily, weekly, monthly trends
- **Historical Data**: Long-term performance tracking

#### Deep Analytics Report
- **AI-Powered Insights**: Performance recommendations
- **Trend Analysis**: Identify patterns and issues
- **Predictive Analytics**: Forecast workload
- **Bottleneck Identification**: Find workflow issues

**Implementation**:
- Components: `components/ComprehensiveAnalytics.tsx`, `components/DeepAnalyticsReport.tsx`, `components/ConsolidatedAnalytics.tsx`
- API: `/api/analytics/historical`, `/api/ai-deep-analytics`

### 11. PDF Generation

**Purpose**: Professional reports for insurance companies

**Features**:
- **Two-Column Layout**: Optimized for insurance managers
- **Complete Information**: All key data on first page
- **Photo Pages**: Damage photos on subsequent pages
- **Company Branding**: Professional appearance
- **VAT Calculations**: Proper tax handling
- **BER Analysis**: Repair cost vs replacement value
- **Technician Info**: Full name and bio

**Generated For**:
- Damage reports
- Repair completions
- Performance reports

**Implementation**: `lib/pdf-generator.ts`, `/api/pdf/generate`

### 12. User Management

**Purpose**: Manage technician accounts and permissions

**Features**:
- **Add Technicians**: Create new accounts
- **Edit Profiles**: Update name, email, bio
- **Clock In/Out**: Manual control
- **Role Assignment**: Admin, Technician, Claim Manager
- **Bio Management**: For PDF reports
- **Work Hours Tracking**: Total hours per timeframe

**Default Users**:
- **Admins**: brad, andre, celeste, braam, melany
- **Technicians**: ben, marshal, malvin, francis
- **Claim Managers**: janine, dane, derilise

**Password Format**: First letter + 123456 (e.g., brad → b123456)

**Implementation**: 
- API: `/api/technicians`, `/api/setup-users`
- Component: `components/UserManagement.tsx`

### 13. Navigation System

**Purpose**: Unified navigation across all dashboards

**Features**:
- **Role-Based Access**: Shows only accessible sections
- **Active Section Highlighting**: Visual feedback
- **Easy Switching**: Quick navigation between dashboards
- **Consistent UX**: Same navigation on all pages

**Sections**:
- Admin Dashboard (admin only)
- Technician Dashboard (admin, technician)
- Claim Manager (admin, claim_manager)

**Implementation**: `components/DashboardNavigation.tsx`

### 14. Mobile Optimization

**Purpose**: Full functionality on mobile devices

**Features**:
- **Responsive Design**: Adapts to all screen sizes
- **Card-Based Layout**: Better for small screens
- **Touch-Friendly**: Large buttons and inputs
- **Simplified Navigation**: Hidden elements on mobile
- **Mobile-First**: Designed for mobile, enhanced for desktop

**Optimized Components**:
- Technician Dashboard
- Ticket Cards
- Damage Report Modal
- Repair Completion Modal
- Action Buttons

## Technical Features

### Real-Time Updates
- **Polling Interval**: 30-60 seconds
- **Background Refresh**: No loading screens
- **Automatic Sync**: RepairShopr status updates
- **Live Metrics**: Dashboard stats update automatically

### Business Hours Calculation
- **Hours**: 8 AM - 6 PM
- **Days**: Monday - Friday
- **Exclusions**: Weekends, after-hours
- **Accurate Tracking**: Only counts actual business time

### Photo Management
- **Storage**: Base64 encoding in database
- **Validation**: 2-6 photos required
- **Size Limit**: 5MB per photo
- **Format**: JPEG, PNG, WebP
- **Click-to-Enlarge**: Full-size preview

### Error Handling
- **Graceful Degradation**: AI fails → fallback to regex
- **User-Friendly Messages**: Clear error descriptions
- **Background Operations**: Don't disrupt UI
- **Retry Logic**: Automatic retry for failed operations

### Security
- **RLS Policies**: Row Level Security on Supabase
- **API Key Authentication**: RepairShopr tokens
- **Session-Only Auth**: No persistent login
- **Role-Based Access**: Proper permission checking

## Integration Points

### RepairShopr
- **Read**: Fetch tickets, ticket details, custom fields
- **Write**: Update ticket status, assign technicians
- **Frequency**: Every 1-5 minutes

### Google Sheets
- **Read**: Parts pricing data
- **Method**: Public CSV export
- **Frequency**: Manual sync (as needed)

### OpenAI
- **Read**: AI analysis results
- **Write**: Send ticket/repair data
- **Frequency**: On-demand (when needed)

### Supabase
- **Read**: Users, damage reports, repair completions
- **Write**: All data operations
- **Frequency**: Real-time

## User Workflows

### Technician Workflow
1. Login → Auto clock-in
2. View assigned tickets
3. Claim new tickets (optional)
4. For damage report tickets:
   - Open damage report modal
   - Upload photos
   - AI analyzes device
   - Complete assessment
   - Submit → Updates RepairShopr
5. For repair tickets:
   - Open repair completion modal
   - AI generates checklist
   - Complete repair
   - Upload photos
   - Submit → Updates RepairShopr
6. Logout → Auto clock-out

### Claim Manager Workflow
1. Login
2. View pending damage reports (cards)
3. Click report → Open modal
4. Review:
   - Technician photos
   - Issue assessment
   - AI analysis
5. Select parts from Google Sheets
6. Calculate repair cost vs replacement
7. Make BER decision
8. Generate PDF
9. Complete report → Updates RepairShopr

### Admin Workflow
1. Login
2. View dashboard metrics
3. Monitor technician performance
4. Assign tickets (if needed)
5. Review analytics
6. Manage technicians
7. Access repair archive
8. Generate reports

## Key Benefits

### For Technicians
- Mobile-friendly interface
- AI-powered assistance
- Quick ticket claiming
- Easy photo documentation
- Automatic status updates
- Clear workflow guidance

### For Claim Managers
- Streamlined damage assessment
- Real-time parts pricing
- Automated calculations
- Professional PDF generation
- Complete repair history
- AI insights for decision-making

### For Administrators
- Complete visibility
- Performance tracking
- Real-time metrics
- Comprehensive analytics
- User management
- Historical data access

### For the Business
- Improved efficiency
- Better documentation
- Quality assurance
- Performance insights
- Scalable architecture
- Reduced errors

## Future Enhancement Opportunities

### Potential Additions
1. **Voice-to-Text**: Voice notes for repairs
2. **Barcode Scanning**: Quick parts identification
3. **Customer Notifications**: SMS/email with photos
4. **Inventory Integration**: Automatic parts tracking
5. **Advanced Analytics**: Machine learning insights
6. **Multi-language Support**: International technicians
7. **Offline Mode**: Work without internet
8. **Automated Testing**: Quality assurance automation
9. **Video Documentation**: Record repair process
10. **API Webhooks**: Real-time RepairShopr integration

### Scalability Improvements
1. Redis caching layer
2. Object storage for photos (S3, R2)
3. Background job queue
4. WebSocket for real-time updates
5. Database connection pooling
6. API rate limiting
7. Load balancing

## Conclusion

Platinum Repairs TechDash 2.0 is a feature-rich, production-ready repair management system that streamlines workflows, improves documentation, and provides valuable insights for repair operations. The system integrates seamlessly with existing tools (RepairShopr, Google Sheets) while adding powerful AI capabilities and comprehensive tracking features.

