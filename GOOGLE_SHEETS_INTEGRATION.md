# Google Sheets Integration Documentation

## 📊 Overview

The Platinum Repairs system integrates with Google Sheets to automatically sync parts pricing data. This document provides complete information about the Google Sheets structure, API integration, and how to rebuild this functionality if needed.

## 🔗 Google Sheets Configuration

### Sheet Details
- **Sheet ID**: `1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE`
- **Shared Link**: [https://docs.google.com/spreadsheets/d/1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE/edit?usp=sharing)
- **Range**: `Sheet1!A:M` (columns A through M contain the pricing data)
- **Access**: Public CSV export (no authentication required)

### No Environment Variables Required
The system uses public CSV export, so no Google Cloud credentials or environment variables are needed.

## 📋 Google Sheets Structure

### Sheet Layout
The Google Sheets document follows a **vertical structure** where each row represents a specific part for a specific iPhone model:

```
Column A: iPhone Model    | Column B: Part Name      | Column D: Insurance | Column E: ETA      | Column M: Replacement Value
iPhone SE (2020)         | Screen Assembly          | R1,499.00          | Next day          | R5,000.00
iPhone SE (2020)         | Casing                   | R2,199.00          | Next day          | R5,000.00
iPhone SE (2020)         | Battery (Generic)        | R899.00            | Next day          | R5,000.00
iPhone SE (2022)         | Screen Assembly          | R3,999.00          | Next day          | 
iPhone 6                 | Screen Assembly          | R579.00            | Next day          | R2,000.00
```

### Data Structure Rules

1. **Column A (Device Model)**: 
   - Contains iPhone model names (e.g., "iPhone SE (2020)", "iPhone 6")
   - Used to extract device brand and model information

2. **Column B (Part Name)**:
   - Contains repair part names (e.g., "Screen Assembly", "Casing", "Battery")
   - Each row represents a specific part for the device in Column A

3. **Column D (Insurance Price)**:
   - Contains insurance prices with "R" prefix (e.g., "R1,499.00", "R2,199.00")
   - This is the primary price used for damage reports

4. **Column E (ETA Information)**:
   - Contains delivery time information (e.g., "Next day", "3-4 weeks", "While stock lasts")
   - Used to determine stock status

5. **Column G (Retail 1 Year)**: Optional retail pricing for 1-year warranty
6. **Column H (Retail 2 Year)**: Optional retail pricing for 2-year warranty  
7. **Column J (Retail Lifetime)**: Optional retail pricing for lifetime warranty
8. **Column M (Replacement Value)**: Device replacement value (e.g., "R5,000.00")

### Pricing Format
- Prices include "R" prefix and comma separators (e.g., "R1,499.00")
- Empty cells are treated as null values
- Only rows with valid insurance prices are processed

## 🔧 API Integration

### Public Google Sheets Access

The system uses **public CSV export** to access the Google Sheets data without requiring authentication:

1. **Public Sheet Access**:
   - The Google Sheet must be set to "Anyone with the link can view"
   - No service account or API credentials required
   - Uses the public CSV export URL

2. **CSV Export URL**:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=0
   ```

3. **No Environment Variables Required**:
   - No Google Cloud project setup needed
   - No service account credentials required
   - No API quotas or authentication issues

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
  part_name TEXT NOT NULL, -- From Column B (Part Name)
  device_brand TEXT NOT NULL, -- Extracted from Column A (iPhone, Samsung, etc.)
  device_model TEXT NOT NULL, -- From Column A (iPhone SE (2020), etc.)
  device_type TEXT NOT NULL DEFAULT 'phone',
  insurance_price DECIMAL(10,2) NOT NULL, -- From Column D (Insurance Price)
  eta_info TEXT DEFAULT 'Next day', -- From Column E (ETA Information)
  retail_1_year DECIMAL(10,2), -- From Column G (Retail 1 Year)
  retail_2_year DECIMAL(10,2), -- From Column H (Retail 2 Year)
  retail_lifetime DECIMAL(10,2), -- From Column J (Retail Lifetime)
  replacement_value DECIMAL(10,2), -- From Column M (Replacement Value)
  stock_status TEXT DEFAULT 'available', -- Derived from ETA info
  sheet_row_number INTEGER, -- Original sheet row for tracking
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

1. **Fetch Data**: Get CSV data from public Google Sheets export URL
2. **Parse CSV**: Convert CSV text into structured rows
3. **Process Each Row**: Extract data from specific columns
4. **Extract Device Info**: Parse brand and model from Column A
5. **Extract Part Info**: Get part name from Column B
6. **Extract Pricing**: Parse insurance price from Column D
7. **Extract Additional Data**: Get ETA, retail prices, and replacement value
8. **Generate Part Numbers**: Create unique identifiers
9. **Store in Database**: Upsert data with conflict resolution

### Code Implementation

```typescript
// Parse the sheet structure based on the screenshot:
// Column A: iPhone model names
// Column B: Repair part names  
// Column D: Insurance prices
// Column E: ETA information
// Column G: Retail 1 Year prices
// Column H: Retail 2 Year prices
// Column J: Retail Lifetime prices
// Column M: Replacement Value

for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) { // Skip header row
  const row = rows[rowIndex]
  
  // Skip empty rows or rows without model name
  if (!row[0] || !row[1]) continue
  
  const deviceModel = row[0].trim()
  const partName = row[1].trim()
  
  // Skip if this looks like a category header (no part name)
  if (!partName || partName === deviceModel) continue
  
  // Extract device brand from model name
  let deviceBrand = 'iPhone' // Default to iPhone
  if (deviceModel.toLowerCase().includes('samsung')) {
    deviceBrand = 'Samsung'
  } else if (deviceModel.toLowerCase().includes('huawei')) {
    deviceBrand = 'Huawei'
  }
  
  // Parse insurance price (Column D)
  const insurancePrice = parsePrice(row[3])
  
  // Skip if no insurance price
  if (insurancePrice === 0) continue
  
  // Parse ETA info (Column E)
  const etaInfo = row[4] || 'Next day'
  
  // Parse retail prices
  const retail1Year = parsePrice(row[6])
  const retail2Year = parsePrice(row[7])
  const retailLifetime = parsePrice(row[9])
  
  // Parse replacement value (Column M)
  const replacementValue = parsePrice(row[12])
  
  // Determine stock status based on ETA
  let stockStatus = 'available'
  if (etaInfo.toLowerCase().includes('while stock lasts')) {
    stockStatus = 'limited'
  } else if (etaInfo.toLowerCase().includes('weeks')) {
    stockStatus = 'backorder'
  }
  
  partsData.push({
    part_number: `${deviceBrand}-${deviceModel}-${partName}`.replace(/\s+/g, '-').toLowerCase(),
    part_name: partName,
    device_brand: deviceBrand,
    device_model: deviceModel,
    device_type: 'phone',
    insurance_price: insurancePrice,
    eta_info: etaInfo,
    retail_1_year: retail1Year || null,
    retail_2_year: retail2Year || null,
    retail_lifetime: retailLifetime || null,
    replacement_value: replacementValue || null,
    stock_status: stockStatus,
    sheet_row_number: rowIndex + 1,
    last_synced: new Date().toISOString()
  })
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
