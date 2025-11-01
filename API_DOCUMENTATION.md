# RepairShopper API Integration Documentation

## Overview
This system integrates with two RepairShopper instances to fetch and filter tickets based on specific criteria. The API makes multiple targeted calls to efficiently retrieve only the tickets that meet our requirements.

## API Endpoints

### Base URLs
- **Platinum Repairs**: `https://platinumrepairs.repairshopr.com/api/v1`
- **Device Doctor**: `https://devicedoctorsa.repairshopr.com/api/v1`

## Filtering Logic

### 1. Status Filtering
The system fetches tickets with these **6 specific statuses only**:
- `Awaiting Rework`
- `Awaiting Workshop Repairs`
- `Awaiting Damage Report`
- `Awaiting Repair`
- `In Progress`
- `Troubleshooting`

### 2. Technician Filtering (Both PR and DD)
For both Platinum Repairs and Device Doctor tickets, only tickets assigned to these technicians are included:
- ✅ **Marshal** (note: single 'l')
- ✅ **Malvin**
- ✅ **Francis**
- ✅ **Ben**
- ✅ **Unassigned** (no technician assigned)

**Excluded Technicians:**
- ❌ **Thasveer**
- ❌ **Shannon**

### 3. Workshop Exclusion (Device Doctor Only)
Device Doctor tickets assigned to these workshops are **excluded**:
- ❌ **Durban Workshop**
- ❌ **Cape Town Workshop**

## API Implementation

### Multiple API Calls Strategy
The system makes **12 total API calls** (6 for each instance):

**Platinum Repairs (6 calls):**
```
GET /tickets?status=Awaiting%20Rework&api_key={TOKEN}
GET /tickets?status=Awaiting%20Workshop%20Repairs&api_key={TOKEN}
GET /tickets?status=Awaiting%20Damage%20Report&api_key={TOKEN}
GET /tickets?status=Awaiting%20Repair&api_key={TOKEN}
GET /tickets?status=In%20Progress&api_key={TOKEN}
GET /tickets?status=Troubleshooting&api_key={TOKEN}
```

**Device Doctor (6 calls):**
```
GET /tickets?status=Awaiting%20Rework&api_key={TOKEN}
GET /tickets?status=Awaiting%20Workshop%20Repairs&api_key={TOKEN}
GET /tickets?status=Awaiting%20Damage%20Report&api_key={TOKEN}
GET /tickets?status=Awaiting%20Repair&api_key={TOKEN}
GET /tickets?status=In%20Progress&api_key={TOKEN}
GET /tickets?status=Troubleshooting&api_key={TOKEN}
```

## Available Endpoints

### 1. Main Tickets API
**Endpoint:** `GET /api/tickets`
**Description:** Returns filtered tickets for the dashboard
**Response:** Array of processed tickets with filtering applied

### 2. Test Filtered Tickets
**Endpoint:** `GET /api/test-filtered-tickets`
**Description:** Returns detailed analysis of filtering results
**Response:** Analysis object with ticket counts, technician breakdown, and sample tickets

### 3. Device Doctor Debug
**Endpoint:** `GET /api/debug-dd-filtered`
**Description:** Shows Device Doctor specific filtering analysis
**Response:** Detailed breakdown of Device Doctor filtering results

## Environment Variables Required

```bash
REPAIRSHOPR_TOKEN=        # Platinum Repairs API token
REPAIRSHOPR_TOKEN_DD=     # Device Doctor API token
```

## Example Response Structure

```json
{
  "tickets": [
    {
      "ticketId": "#13151",
      "ticketNumber": "13151",
      "description": "Naked Insurance DR - Samsung Galaxy S23 Ultra...",
      "status": "In Progress",
      "timeAgo": "4d",
      "timestamp": "2025-09-03T12:06:00.000Z",
      "deviceInfo": "samsung galaxy s23",
      "assignedTo": "Ben",
      "aiPriority": "P4",
      "estimatedTime": "2h",
      "ticketType": "DD"
    }
  ]
}
```

## Filtering Examples

### ✅ Included Tickets
- **Both PR and DD**: Tickets assigned to Marshal, Malvin, Francis, Ben, or unassigned
- **Device Doctor**: Tickets with target status not assigned to excluded workshops

### ❌ Excluded Tickets
- **Device Doctor**: Tickets assigned to Durban Workshop
- **Device Doctor**: Tickets assigned to Cape Town Workshop  
- **Both PR and DD**: Tickets assigned to Thasveer or Shannon
- **Both PR and DD**: Tickets assigned to technicians not in the allowed list
- **Both**: Tickets with statuses other than the 6 target statuses

## Logging and Debugging

The system provides detailed console logging:
- API call URLs and responses
- Filtering decisions with reasons
- Ticket counts at each filtering stage
- Final results breakdown by type and technician

## Performance Considerations

- **Parallel API calls**: All 12 API calls execute simultaneously
- **Server-side filtering**: Uses RepairShopper's status parameter for efficiency
- **Minimal data transfer**: Only fetches relevant tickets
- **Client-side filtering**: Additional technician/workshop filtering applied after API calls

## Troubleshooting

### Common Issues
1. **No tickets returned**: Check API tokens and network connectivity
2. **Unexpected filtering**: Verify technician names match exactly (case-sensitive)
3. **Missing tickets**: Ensure status names match RepairShopper exactly

### Debug Endpoints
Use `/api/debug-dd-filtered` to see detailed filtering analysis for Device Doctor tickets.

