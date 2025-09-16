// New RepairShopr API implementation based on working authentication method
export interface RepairShoprTicket {
  id: string
  number?: string
  problem_type: string
  status: string
  created_at: string
  updated_at: string
  customer_business_then_name: string
  location_name: string
  user_id: number | null
  subject: string
  comment: string
  user?: {
    id: number
    email: string
    full_name: string
    group: string
  }
  assets: Array<{
    name: string
    asset_type_name: string
    manufacturer: string
    model: string
  }>
  custom_fields?: Array<{
    id: number
    name: string
    value: string
  }>
}

export interface ProcessedTicket {
  ticketId: string
  ticketNumber: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'PR' | 'DD'
  customFields?: Array<{
    id: number
    name: string
    value: string
  }>
  claimNumber?: string
}

// API Configuration
const REPAIRSHOPR_BASE_URL = 'https://platinumrepairs.repairshopr.com/api/v1'
const REPAIRSHOPR_DD_BASE_URL = 'https://devicedoctorsa.repairshopr.com/api/v1'

// Status mappings - only map to the 6 allowed statuses
const STATUS_MAPPING: Record<string, string> = {
  // Awaiting Rework
  'Parts Allocated': 'Awaiting Rework',
  'Waiting for Parts': 'Awaiting Rework',
  
  // Awaiting Workshop Repairs  
  'Parts Required': 'Awaiting Workshop Repairs',
  'Parts Ordered': 'Awaiting Workshop Repairs',
  'Parts Transferred': 'Awaiting Workshop Repairs',
  'To Be Repaired Off-site': 'Awaiting Workshop Repairs',
  'Cape Town Repair': 'Awaiting Workshop Repairs',
  
  // Awaiting Damage Report
  'Damage Report': 'Awaiting Damage Report',
  
  // Awaiting Repair
  'Awaiting Virtual Assessment': 'Awaiting Repair',
  'No Parts': 'Awaiting Repair',
  
  // Awaiting Authorization (keep as is)
  'Awaiting Authorization': 'Awaiting Authorization',
  
  // In Progress
  'In Progress': 'In Progress',
  
  // Completed/Other (not shown in main view)
  'Completed': 'Completed',
  'Resolved': 'Completed',
  'Closed File': 'Completed',
  'Salvage': 'Completed',
  'BER': 'Completed'
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60))
    return `${minutes}m`
  } else if (diffInHours < 24) {
    return `${diffInHours.toFixed(1)}h`
  } else {
    const days = Math.floor(diffInHours / 24)
    return `${days}d`
  }
}

// Helper function to extract device info from description using AI
async function extractDeviceInfo(description: string, fullTicketData?: any): Promise<string> {
  try {
    // Import the device detection function
    const { getCachedDeviceDetection } = await import('./device-detection')
    const result = await getCachedDeviceDetection(description, fullTicketData)
    
    // Only use AI result if confidence is high enough
    if (result.confidence > 0.6) {
      return result.deviceName
    }
    
    // Fallback to regex patterns for low confidence
    return fallbackDeviceExtraction(description)
  } catch (error) {
    console.error('AI device detection failed, using fallback:', error)
    return fallbackDeviceExtraction(description)
  }
}

// Fallback device extraction using regex patterns
function fallbackDeviceExtraction(description: string): string {
  const text = description.toLowerCase()
  
  // Common device patterns
  const devicePatterns = [
    /iphone\s*\d+/i,
    /ipad\s*\w*/i,
    /macbook\s*\w*/i,
    /samsung\s*galaxy\s*[a-z]*\d*/i,
    /huawei\s*[a-z]*\d*/i,
    /lenovo\s*thinkpad\s*[a-z]*\d*/i,
    /nintendo\s*switch\s*(oled|lite)?/i,
  ]
  
  for (const pattern of devicePatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].trim()
    }
  }
  
  // Fallback to extracting brand + model patterns
  const brandModel = text.match(/([A-Z][a-z]+)\s+([A-Z][A-Za-z0-9\s]+)/)?.[0]
  if (brandModel) {
    return brandModel.trim()
  }
  
  return 'Unknown Device'
}

// Calculate business hours between two dates (8 AM - 6 PM, Monday-Friday)
function calculateBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let businessHours = 0
  
  // Business hours: 8 AM to 6 PM, Monday to Friday
  const businessStart = 8 // 8 AM
  const businessEnd = 18 // 6 PM
  
  while (start < end) {
    const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Only count Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dayStart = new Date(start)
      dayStart.setHours(businessStart, 0, 0, 0)
      
      const dayEnd = new Date(start)
      dayEnd.setHours(businessEnd, 0, 0, 0)
      
      // Calculate overlap with business hours for this day
      const effectiveStart = start < dayStart ? dayStart : start
      const effectiveEnd = end < dayEnd ? end : dayEnd
      
      if (effectiveStart < effectiveEnd) {
        businessHours += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60)
      }
    }
    
    // Move to next day
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
  }
  
  return businessHours
}

// Format business hours into a readable string
function formatBusinessHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  } else if (hours < 24) {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
  } else {
    const days = Math.floor(hours / 8) // 8 business hours per day
    const remainingHours = Math.round(hours % 8)
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }
}

// Fetch tickets from RepairShopr with specific status filtering
async function fetchFromRepairShoprWithStatus(token: string, baseUrl: string, status: string): Promise<RepairShoprTicket[]> {
  try {
    console.log(`🔍 Fetching ${status} tickets from: ${baseUrl.includes('devicedoctor') ? 'DEVICE DOCTOR' : 'PLATINUM REPAIRS'} API`)
    
    let allTickets: RepairShoprTicket[] = []
    let currentPage = 1
    let totalPages = 1
    
    // Fetch all pages of results
    do {
      const listUrl = `${baseUrl}/tickets?status=${encodeURIComponent(status)}&page=${currentPage}&limit=100&api_key=${token}`
      console.log(`📄 Fetching page ${currentPage}/${totalPages}: ${listUrl}`)
      console.log(`🔍 FULL URL BREAKDOWN:`)
      console.log(`   Base URL: ${baseUrl}`)
      console.log(`   Status: ${status}`)
      console.log(`   Page: ${currentPage}`)
      console.log(`   Limit: 100`)
      console.log(`   API Key: ${token.substring(0, 10)}...`)
      console.log(`   Final URL: ${listUrl}`)
      
      const listResponse = await fetch(listUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      console.log(`Page ${currentPage} response status: ${listResponse.status}`)
      
      if (!listResponse.ok) {
        const errorText = await listResponse.text()
        console.error(`❌ API error on page ${currentPage}: ${listResponse.status} - ${errorText}`)
        throw new Error(`API error: ${listResponse.status} - ${errorText}`)
      }
      
      const listData = await listResponse.json()
      console.log(`🔍 API Response for ${status} page ${currentPage}:`, {
        hasTickets: !!listData.tickets,
        ticketCount: listData.tickets?.length || 0,
        meta: listData.meta,
        sampleTicket: listData.tickets?.[0] ? {
          id: listData.tickets[0].id,
          number: listData.tickets[0].number,
          status: listData.tickets[0].status,
          subject: listData.tickets[0].subject?.substring(0, 50) + '...'
        } : null
      })
      
      const tickets = listData.tickets || []
      const meta = listData.meta || {}
      
      totalPages = meta.total_pages || 1
      console.log(`📄 Page ${currentPage}: ${tickets.length} tickets (total pages: ${totalPages})`)
      
      allTickets = allTickets.concat(tickets)
      currentPage++
      
    } while (currentPage <= totalPages)
    
    console.log(`✅ Successfully fetched ${allTickets.length} total tickets with status: ${status}`)
    
    // For completed tickets, we don't need detailed info, just return the basic tickets
    // This will be much faster and allow us to process more tickets
    return allTickets
    
  } catch (error) {
    console.error(`❌ Error in fetchFromRepairShoprWithStatus:`, error)
    return []
  }
}

// Fetch tickets from RepairShopr using api_key query parameter (fallback method)
async function fetchFromRepairShopr(token: string, baseUrl: string): Promise<RepairShoprTicket[]> {
  try {
    const url = `${baseUrl}/tickets?api_key=${token}`
    console.log(`🔍 Fetching from: ${baseUrl.includes('devicedoctor') ? 'DEVICE DOCTOR' : 'PLATINUM REPAIRS'} API`)
    console.log(`URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API error: ${response.status} - ${errorText}`)
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`✅ Successfully fetched ${data.tickets?.length || 0} tickets`)
    
    return data.tickets || []
  } catch (error) {
    console.error('Error fetching from RepairShopr:', error)
    return []
  }
}

// Process a single ticket
async function processTicket(ticket: RepairShoprTicket, instance: 'platinum' | 'devicedoctor'): Promise<ProcessedTicket> {
  const description = ticket.subject || ticket.comment || 'No description available'
  const deviceInfo = await extractDeviceInfo(description, ticket)
  
  // Use status change time (updated_at) instead of creation time for wait time calculation
  const statusChangeDate = new Date(ticket.updated_at || ticket.created_at)
  const createdDate = new Date(ticket.created_at)
  
  // Calculate business hours wait time since status change
  const businessWaitTime = calculateBusinessHours(statusChangeDate, new Date())
  
  // Extract claim number from custom fields
  let claimNumber = ''
  if (ticket.custom_fields && ticket.custom_fields.length > 0) {
    console.log(`🔍 Processing custom fields for ticket ${ticket.number || ticket.id}:`, ticket.custom_fields)
    
    // Look for claim number in custom fields
    const claimField = ticket.custom_fields.find(field => 
      field.name && (
        field.name.toLowerCase().includes('claim') ||
        field.name.toLowerCase().includes('case') ||
        field.name.toLowerCase().includes('reference')
      )
    )
    
    if (claimField && claimField.value) {
      claimNumber = claimField.value
      console.log(`✅ Found claim number in custom fields: ${claimNumber}`)
    } else {
      console.log(`❌ No claim number found in custom fields`)
    }
  } else {
    console.log(`❌ No custom fields available for ticket ${ticket.number || ticket.id}`)
  }
  
  return {
    ticketId: `#${ticket.number || ticket.id}`,
    ticketNumber: ticket.number || ticket.id,
    description,
    status: STATUS_MAPPING[ticket.status] || ticket.status,
    timeAgo: formatBusinessHours(businessWaitTime),
    timestamp: statusChangeDate, // Use status change time for wait time calculation
    deviceInfo,
    assignedTo: ticket.user?.full_name,
    aiPriority: 'P4', // Default priority
    estimatedTime: '2h', // Default estimated time
    ticketType: instance === 'platinum' ? 'PR' : 'DD',
    customFields: ticket.custom_fields,
    claimNumber
  }
}

// Main function to get all tickets from both APIs with proper filtering
export async function getAllTickets(): Promise<ProcessedTicket[]> {
  const token1 = process.env.REPAIRSHOPR_TOKEN
  const token2 = process.env.REPAIRSHOPR_TOKEN_DD
  
  if (!token1 || !token2) {
    console.error('RepairShopr tokens not found in environment variables')
    return []
  }
  
  try {
    console.log('🚀 Starting to fetch tickets from both APIs with proper filtering...')
    
    // Define the 7 specific statuses we want to fetch (active tickets only)
    const targetStatuses = [
      'Awaiting Rework',
      'Awaiting Workshop Repairs', 
      'Awaiting Damage Report',
      'Awaiting Repair',
      'In Progress',
      'Awaiting Walk-in Repair',
      'Awaiting Walk-in DR'
    ]
    
    // Define allowed technicians for Device Doctor (expanded list)
    const allowedTechnicians1 = ['Marshal', 'Malvin', 'Francis', 'Ben', 'Thasveer', 'Shannon', 'Reece']
    const excludedTechnicians1 = [] // No longer excluding any technicians
    const excludedWorkshops1 = [] // No longer excluding workshops - we want to include them
    
    // Fetch tickets for each status from both APIs (7 statuses × 2 APIs = 14 calls)
    const allApiCalls: Promise<RepairShoprTicket[]>[] = []
    
    // Platinum Repairs API calls
    for (const status of targetStatuses) {
      allApiCalls.push(fetchFromRepairShoprWithStatus(token1, REPAIRSHOPR_BASE_URL, status))
    }
    
    // Device Doctor API calls  
    for (const status of targetStatuses) {
      allApiCalls.push(fetchFromRepairShoprWithStatus(token2, REPAIRSHOPR_DD_BASE_URL, status))
    }
    
    // Execute all API calls in parallel
    const allResults = await Promise.all(allApiCalls)
    
    // Split results back into PR and DD tickets
    const prTickets = allResults.slice(0, 7).flat()
    const ddTickets = allResults.slice(7, 14).flat()
    
    console.log(`🔍 Raw API results: PR tickets: ${prTickets.length}, DD tickets: ${ddTickets.length}`)
    
    // Process tickets with instance information (async)
    const processedTickets1 = await Promise.all(prTickets.map(ticket => processTicket(ticket, 'platinum')))
    const processedTickets2 = await Promise.all(ddTickets.map(ticket => processTicket(ticket, 'devicedoctor')))
    const processedTickets = [...processedTickets1, ...processedTickets2]
    
    console.log(`🔍 Processed tickets: PR: ${processedTickets1.length}, DD: ${processedTickets2.length}`)
    
    // Apply technician filtering and workshop mapping for both DD and PR tickets
    let filteredTickets = processedTickets.filter(ticket => {
      // Find the original ticket from the appropriate API response
      const originalTicket = ticket.ticketType === 'DD' 
        ? ddTickets.find(t => String(t.number || t.id) === String(ticket.ticketNumber))
        : prTickets.find(t => String(t.number || t.id) === String(ticket.ticketNumber))
      
      const assignedTo = originalTicket?.user?.full_name
      
      // Map workshop assignments to specific technicians
      if (assignedTo === 'Durban Workshop') {
        ticket.assignedTo = 'Thasveer'
        console.log(`🏭 Mapping DD ticket ${ticket.ticketNumber} from Durban Workshop to Thasveer`)
      } else if (assignedTo === 'Cape Town Workshop') {
        ticket.assignedTo = 'Reece'
        console.log(`🏭 Mapping DD ticket ${ticket.ticketNumber} from Cape Town Workshop to Reece`)
      }
      
      // Include all tickets - no more restrictive filtering
      console.log(`✅ Including ${ticket.ticketType} ticket ${ticket.ticketNumber} - assigned to: ${ticket.assignedTo || assignedTo || 'Unassigned'}`)
      return true
    })
    
    console.log(`🔍 After technician/workshop filtering: ${filteredTickets.length} tickets`)
    console.log(`🔍 Final tickets by type:`, {
      PR: filteredTickets.filter(t => t.ticketType === 'PR').length,
      DD: filteredTickets.filter(t => t.ticketType === 'DD').length
    })
    
    // Sort by status priority and timestamp
    const statusPriority: Record<string, number> = {
      'Awaiting Rework': 1,
      'Awaiting Workshop Repairs': 2, 
      'Awaiting Damage Report': 3,
      'Awaiting Repair': 4,
      'In Progress': 5
    }
    
    return filteredTickets.sort((a, b) => {
      const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999)
      if (statusDiff !== 0) return statusDiff
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
    
  } catch (error) {
    console.error('❌ Error in getAllTickets:', error)
    return []
  }
}

// New function specifically for syncing completed tickets
export async function getAllCompletedTickets(): Promise<ProcessedTicket[]> {
  const token1 = process.env.REPAIRSHOPR_TOKEN
  const token2 = process.env.REPAIRSHOPR_TOKEN_DD
  
  if (!token1 || !token2) {
    console.error('RepairShopr tokens not found in environment variables')
    return []
  }
  
  try {
    console.log('🚀 Starting to fetch ALL tickets and filter for completed status...')
    
    // Use the exact same working approach as getAllTickets function
    // Define the statuses we want to fetch (including Resolved)
    const targetStatuses = [
      'Awaiting Rework',
      'Awaiting Workshop Repairs', 
      'Awaiting Damage Report',
      'Awaiting Repair',
      'In Progress',
      'Resolved'  // Add Resolved to the list
    ]
    
    // Define allowed technicians for Device Doctor
    const allowedTechnicians2 = ['Marshal', 'Malvin', 'Francis', 'Ben']
    const excludedTechnicians2 = ['Thasveer', 'Shannon']
    const excludedWorkshops2 = ['Durban Workshop', 'Cape Town Workshop']
    
    // Log the base URLs being used
    console.log(`🔍 API BASE URLS:`)
    console.log(`   Platinum Repairs: ${REPAIRSHOPR_BASE_URL}`)
    console.log(`   Device Doctor: ${REPAIRSHOPR_DD_BASE_URL}`)
    console.log(`🔍 TARGET STATUSES: ${targetStatuses.join(', ')}`)
    
    // Fetch tickets for each status from both APIs (6 statuses × 2 APIs = 12 calls)
    const allApiCalls: Promise<RepairShoprTicket[]>[] = []
    
    // Platinum Repairs API calls
    for (const status of targetStatuses) {
      allApiCalls.push(fetchFromRepairShoprWithStatus(token1, REPAIRSHOPR_BASE_URL, status))
    }
    
    // Device Doctor API calls  
    for (const status of targetStatuses) {
      allApiCalls.push(fetchFromRepairShoprWithStatus(token2, REPAIRSHOPR_DD_BASE_URL, status))
    }
    
    // Execute all API calls in parallel
    const allResults = await Promise.all(allApiCalls)
    
    // Split results back into PR and DD tickets
    const prTickets = allResults.slice(0, targetStatuses.length).flat()
    const ddTickets = allResults.slice(targetStatuses.length, targetStatuses.length * 2).flat()
    
    console.log(`🔍 Raw API results: PR tickets: ${prTickets.length}, DD tickets: ${ddTickets.length}`)
    
    // Filter for completed/resolved tickets
    const completedStatuses = ['Resolved', 'Completed', 'Closed File', 'Salvage', 'BER', 'Closed']
    
    const prCompletedTickets = prTickets.filter(ticket => {
      const status = ticket.status || ''
      const isCompleted = completedStatuses.some(completedStatus => 
        status === completedStatus || status.toLowerCase() === completedStatus.toLowerCase()
      )
      if (isCompleted) {
        console.log(`✅ Found completed PR ticket ${ticket.number || ticket.id}: ${ticket.status}`)
      }
      return isCompleted
    })
    
    const ddCompletedTickets = ddTickets.filter(ticket => {
      const status = ticket.status || ''
      const isCompleted = completedStatuses.some(completedStatus => 
        status === completedStatus || status.toLowerCase() === completedStatus.toLowerCase()
      )
      if (isCompleted) {
        console.log(`✅ Found completed DD ticket ${ticket.number || ticket.id}: ${ticket.status}`)
      }
      return isCompleted
    })
    
    console.log(`🔍 Completed tickets found: PR: ${prCompletedTickets.length}, DD: ${ddCompletedTickets.length}`)
    
    // Process tickets with instance information (async)
    const processedTickets1 = await Promise.all(prCompletedTickets.map(ticket => processTicket(ticket, 'platinum')))
    const processedTickets2 = await Promise.all(ddCompletedTickets.map(ticket => processTicket(ticket, 'devicedoctor')))
    const processedTickets = [...processedTickets1, ...processedTickets2]
    
    console.log(`🔍 Processed completed tickets: PR: ${processedTickets1.length}, DD: ${processedTickets2.length}`)
    
    // Apply technician filtering for both DD and PR tickets
    const allowedTechnicians3 = ['Marshal', 'Malvin', 'Francis', 'Ben']
    const excludedTechnicians3 = ['Thasveer', 'Shannon']
    const excludedWorkshops3 = ['Durban Workshop', 'Cape Town Workshop']
    
    let filteredTickets = processedTickets.filter(ticket => {
      // Find the original ticket from the appropriate API response
      const originalTicket = ticket.ticketType === 'DD' 
        ? ddCompletedTickets.find(t => String(t.number || t.id) === String(ticket.ticketNumber))
        : prCompletedTickets.find(t => String(t.number || t.id) === String(ticket.ticketNumber))
      
      const assignedTo = originalTicket?.user?.full_name
      
      if (ticket.ticketType === 'DD') {
        // Exclude if assigned to excluded workshops
        if (assignedTo && excludedWorkshops3.includes(assignedTo)) {
          console.log(`🚫 Excluding DD completed ticket ${ticket.ticketNumber} - assigned to excluded workshop: ${assignedTo}`)
          return false
        }
      }
      
      // Apply same technician filtering to both DD and PR tickets
      // Only include if assigned to allowed technicians or unassigned
      if (assignedTo && !allowedTechnicians3.includes(assignedTo)) {
        console.log(`🚫 Excluding ${ticket.ticketType} completed ticket ${ticket.ticketNumber} - assigned to non-allowed technician: ${assignedTo}`)
        return false
      }
      
      // Also exclude specific technicians
      if (assignedTo && excludedTechnicians3.includes(assignedTo)) {
        console.log(`🚫 Excluding ${ticket.ticketType} completed ticket ${ticket.ticketNumber} - assigned to excluded technician: ${assignedTo}`)
        return false
      }
      
      console.log(`✅ Including ${ticket.ticketType} completed ticket ${ticket.ticketNumber} - assigned to: ${assignedTo || 'Unassigned'}`)
      return true
    })
    
    console.log(`🔍 After technician/workshop filtering: ${filteredTickets.length} completed tickets`)
    console.log(`🔍 Final completed tickets by type:`, {
      PR: filteredTickets.filter(t => t.ticketType === 'PR').length,
      DD: filteredTickets.filter(t => t.ticketType === 'DD').length
    })
    
    // Sort by completion date (most recent first)
    filteredTickets.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    console.log(`✅ Successfully fetched ${filteredTickets.length} completed tickets`)
    return filteredTickets
    
  } catch (error) {
    console.error('❌ Error in getAllCompletedTickets:', error)
    return []
  }
}

// Helper function to fetch all tickets from RepairShopr (no status filtering)
async function fetchAllTicketsFromRepairShopr(token: string, baseUrl: string): Promise<RepairShoprTicket[]> {
  try {
    console.log(`🔍 Fetching ALL tickets from: ${baseUrl.includes('devicedoctor') ? 'DEVICE DOCTOR' : 'PLATINUM REPAIRS'} API`)
    
    let allTickets: RepairShoprTicket[] = []
    let currentPage = 1
    let totalPages = 1
    
    // Fetch all pages of results (same approach as working code)
    do {
      const url = `${baseUrl}/tickets?page=${currentPage}&limit=100`
      console.log(`📄 Fetching page ${currentPage}/${totalPages}: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log(`Page ${currentPage} response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API error on page ${currentPage}: ${response.status} - ${errorText}`)
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      const tickets = data.tickets || []
      const meta = data.meta || {}
      
      totalPages = meta.total_pages || 1
      console.log(`📄 Page ${currentPage}: ${tickets.length} tickets (total pages: ${totalPages})`)
      
      allTickets = allTickets.concat(tickets)
      currentPage++
      
    } while (currentPage <= totalPages)
    
    console.log(`✅ Successfully fetched ${allTickets.length} total tickets`)
    return allTickets
    
  } catch (error) {
    console.error('❌ Error in fetchAllTicketsFromRepairShopr:', error)
    return []
  }
}
