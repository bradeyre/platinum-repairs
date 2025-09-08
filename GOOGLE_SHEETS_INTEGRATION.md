# Google Sheets Integration Documentation

## 📊 Overview

The Platinum Repairs system integrates with Google Sheets to automatically sync parts pricing data. This document provides complete information about the Google Sheets structure, API integration, and how to rebuild this functionality if needed.

## 🔗 Google Sheets Configuration

### Sheet Details
- **Sheet ID**: `1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE`
- **Range**: `Sheet1!A:Z` (all data from column A to Z)
- **Access**: Read-only via Google Sheets API

### Required Environment Variables
```bash
# Google Sheets API Credentials
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your_service_account_email
GOOGLE_CLIENT_ID=your_client_id
```

## 📋 Google Sheets Structure

### Sheet Layout
The Google Sheets document follows a specific structure for parts pricing:

```
Row 1 (Header):    | Part 1 | Part 2 | Part 3 | Part 4 | ... |
Row 2 (iPhone):    |        |        |        |        | ... |
Row 3 (iPhone 12): | R1500  | R800   | R200   | R300   | ... |
Row 4 (iPhone 13): | R1600  | R850   | R220   | R320   | ... |
Row 5 (Samsung):   |        |        |        |        | ... |
Row 6 (Galaxy S21):| R1400  | R750   | R180   | R280   | ... |
```

### Data Structure Rules

1. **Brand Headers**: 
   - Row contains only brand name in column A (e.g., "iPhone", "Samsung")
   - Column B and beyond are empty
   - Brand name must contain "phone" (case insensitive)

2. **Model Rows**:
   - First column contains model name (e.g., "iPhone 12", "Galaxy S21")
   - Subsequent columns contain pricing with "R" prefix (e.g., "R1500", "R800")

3. **Part Names**:
   - Extracted from header row (Row 1)
   - Column headers represent part names (e.g., "Screen", "Battery", "Camera")

4. **Pricing Format**:
   - Prices must include "R" prefix
   - Supports comma separators (e.g., "R1,500")
   - Empty cells or non-price values are ignored

## 🔧 API Integration

### Google Sheets API Setup

1. **Create Service Account**:
   - Go to Google Cloud Console
   - Create a new project or select existing
   - Enable Google Sheets API
   - Create service account credentials
   - Download JSON key file

2. **Share Sheet**:
   - Share the Google Sheet with the service account email
   - Grant "Viewer" permissions

3. **Environment Variables**:
   - Extract credentials from JSON key file
   - Set environment variables in Vercel dashboard

### API Endpoints

#### Sync Parts Data
```http
POST /api/google-sheets/sync
```
- **Purpose**: Sync parts pricing from Google Sheets to database
- **Response**: Success status and parts count

#### Get Parts Pricing
```http
GET /api/parts-pricing?brand=iPhone&model=iPhone 12
```
- **Parameters**:
  - `brand`: Filter by device brand
  - `model`: Filter by device model
  - `search`: Search across all fields
  - `action=brands`: Get unique brands
  - `action=models&brand=X`: Get models for brand

## 🗄️ Database Schema

### parts_pricing Table
```sql
CREATE TABLE parts_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL, -- Generated: brand-model-partname
  part_name TEXT NOT NULL, -- From Google Sheet header row
  device_brand TEXT NOT NULL, -- From brand header row
  device_model TEXT NOT NULL, -- From model row
  device_type TEXT NOT NULL, -- 'phone' or 'laptop'
  price_zar DECIMAL(10,2) NOT NULL, -- Price in ZAR
  eta_days INTEGER DEFAULT 1, -- Estimated delivery days
  stock_status TEXT DEFAULT 'available', -- Stock availability
  sheet_row_number INTEGER, -- Original sheet row for tracking
  sheet_col_number INTEGER, -- Original sheet column for tracking
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Unique Constraints
```sql
UNIQUE(part_name, device_brand, device_model)
```

## 🔄 Sync Process

### Parsing Algorithm

1. **Fetch Data**: Get all rows from Google Sheets
2. **Find Brand Headers**: Look for rows with only column A populated
3. **Process Models**: For each brand, find subsequent model rows
4. **Extract Parts**: For each model, extract pricing from columns
5. **Generate Part Numbers**: Create unique identifiers
6. **Store in Database**: Upsert data with conflict resolution

### Code Implementation

```typescript
// Parse the sheet structure: Brand headers, then models, then parts with pricing
for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
  const row = rows[rowIndex]
  
  // Look for brand headers (like "iPhone")
  if (row[0] && !row[1] && row[0].toLowerCase().includes('phone')) {
    const brand = row[0]
    
    // Look ahead for model rows and part pricing
    let modelRowIndex = rowIndex + 1
    while (modelRowIndex < rows.length && rows[modelRowIndex][0]) {
      const modelRow = rows[modelRowIndex]
      const model = modelRow[0]
      
      // Find parts in subsequent columns (Screen, Battery, etc.)
      for (let colIndex = 1; colIndex < modelRow.length; colIndex++) {
        const partData = modelRow[colIndex]
        if (partData && partData.includes('R')) { // Contains price with 'R' prefix
          // Extract part name from header row
          const headerRow = rows[0] // Assuming first row has part names
          const partName = headerRow[colIndex] || `Part ${colIndex}`
          
          // Extract price (remove 'R' and parse)
          const price = parseFloat(partData.replace('R', '').replace(',', '') || '0')
          
          if (price > 0) {
            partsData.push({
              part_number: `${brand}-${model}-${partName}`.replace(/\s+/g, '-').toLowerCase(),
              part_name: partName,
              device_brand: brand,
              device_model: model,
              device_type: brand.toLowerCase().includes('iphone') ? 'phone' : 'laptop',
              price_zar: price,
              eta_days: 1, // Default ETA
              stock_status: 'available',
              sheet_row_number: modelRowIndex + 1,
              sheet_col_number: colIndex + 1,
              last_synced: new Date().toISOString()
            })
          }
        }
      }
      modelRowIndex++
    }
  }
}
```

## 🧪 Testing

### Manual Testing

1. **Test Sync Endpoint**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/google-sheets/sync
   ```

2. **Test Parts API**:
   ```bash
   curl "https://your-app.vercel.app/api/parts-pricing?action=brands"
   curl "https://your-app.vercel.app/api/parts-pricing?brand=iPhone"
   curl "https://your-app.vercel.app/api/parts-pricing?search=screen"
   ```

3. **Verify Database**:
   - Check Supabase dashboard for `parts_pricing` table
   - Verify data matches Google Sheets structure

### Expected Results

- **Sync Response**: `{"success": true, "partsCount": X, "parts": [...]}`
- **Brands Response**: `{"success": true, "brands": ["iPhone", "Samsung", ...]}`
- **Models Response**: `{"success": true, "models": ["iPhone 12", "iPhone 13", ...]}`
- **Search Response**: `{"success": true, "parts": [...]}`

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify service account credentials
   - Check sheet sharing permissions
   - Validate environment variables

2. **No Data Retrieved**:
   - Check sheet ID and range
   - Verify sheet structure matches expected format
   - Check for empty rows or missing data

3. **Parsing Errors**:
   - Verify brand headers contain "phone"
   - Check pricing format includes "R" prefix
   - Ensure header row has part names

4. **Database Errors**:
   - Check table schema matches interface
   - Verify unique constraints
   - Check Supabase connection

### Debug Commands

```bash
# Check environment variables
curl https://your-app.vercel.app/api/debug-env

# Test Google Sheets connection
curl -X POST https://your-app.vercel.app/api/google-sheets/sync

# Check parts data
curl "https://your-app.vercel.app/api/parts-pricing"
```

## 🔄 Rebuilding from Scratch

If you need to rebuild this integration:

1. **Set up Google Sheets API**:
   - Create Google Cloud project
   - Enable Sheets API
   - Create service account
   - Download credentials

2. **Install Dependencies**:
   ```bash
   npm install googleapis
   ```

3. **Create Files**:
   - `lib/google-sheets.ts` - Main integration logic
   - `app/api/google-sheets/sync/route.ts` - Sync endpoint
   - `app/api/parts-pricing/route.ts` - Parts API
   - `components/PartsPricingModal.tsx` - UI component

4. **Set Environment Variables**:
   - Add Google Sheets credentials to Vercel
   - Test with debug endpoints

5. **Create Database Table**:
   - Use the schema provided above
   - Set up proper indexes and constraints

## 📝 Maintenance

### Regular Tasks

1. **Monitor Sync Status**:
   - Check sync logs for errors
   - Verify data freshness
   - Monitor API quotas

2. **Update Sheet Structure**:
   - Document any changes to sheet format
   - Update parsing logic if needed
   - Test thoroughly before deployment

3. **Performance Optimization**:
   - Monitor sync times
   - Optimize database queries
   - Consider caching strategies

### Backup Strategy

1. **Export Data**:
   - Regular exports of parts pricing data
   - Backup of Google Sheets
   - Version control of integration code

2. **Disaster Recovery**:
   - Document all configuration steps
   - Maintain service account credentials
   - Keep environment variable documentation

## 📞 Support

For issues with Google Sheets integration:

1. Check this documentation first
2. Verify environment variables
3. Test API endpoints
4. Check Google Cloud Console for API quotas
5. Review Supabase logs for database errors

---

**Last Updated**: Current Session
**Version**: 1.0
**Status**: ✅ Complete and Tested
**Dependencies**: googleapis, @supabase/supabase-js
