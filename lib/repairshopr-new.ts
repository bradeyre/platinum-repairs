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

// Helper function to extract device info from description
function extractDeviceInfo(description: string): string {
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

// Fetch tickets from RepairShopr with specific status filtering
async function fetchFromRepairShoprWithStatus(token: string, baseUrl: string, status: string): Promise<RepairShoprTicket[]> {
  try {
    // Use proper API filtering with status parameter
    const url = `${baseUrl}/tickets?status=${encodeURIComponent(status)}&api_key=${token}`
    console.log(`🔍 Fetching ${status} tickets from: ${baseUrl.includes('devicedoctor') ? 'DEVICE DOCTOR' : 'PLATINUM REPAIRS'} API`)
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
    console.log(`✅ Successfully fetched ${data.tickets?.length || 0} tickets with status: ${status}`)
    
    return data.tickets || []
  } catch (error) {
    console.error(`Error fetching ${status} tickets from RepairShopr:`, error)
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
function processTicket(ticket: RepairShoprTicket, instance: 'platinum' | 'devicedoctor'): ProcessedTicket {
  const description = ticket.subject || ticket.comment || 'No description available'
  const deviceInfo = extractDeviceInfo(description)
  const createdDate = new Date(ticket.created_at)
  
  return {
    ticketId: `#${ticket.number || ticket.id}`,
    ticketNumber: ticket.number || ticket.id,
    description,
    status: STATUS_MAPPING[ticket.status] || ticket.status,
    timeAgo: getTimeAgo(createdDate),
    timestamp: createdDate,
    deviceInfo,
    assignedTo: ticket.user?.full_name,
    aiPriority: 'P4', // Default priority
    estimatedTime: '2h', // Default estimated time
    ticketType: instance === 'platinum' ? 'PR' : 'DD'
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
    
    // Define the 5 specific statuses we want to fetch
    const targetStatuses = [
      'Awaiting Rework',
      'Awaiting Workshop Repairs', 
      'Awaiting Damage Report',
      'Awaiting Repair',
      'In Progress'
    ]
    
    // Define allowed technicians for Device Doctor
    const allowedTechnicians = ['Marshal', 'Malvin', 'Francis', 'Ben']
    const excludedTechnicians = ['Thasveer', 'Shannon'] // Additional technicians to exclude
    const excludedWorkshops = ['Durban Workshop', 'Cape Town Workshop']
    
    // Fetch tickets for each status from both APIs (5 statuses × 2 APIs = 10 calls)
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
    const prTickets = allResults.slice(0, 5).flat()
    const ddTickets = allResults.slice(5, 10).flat()
    
    console.log(`🔍 Raw API results: PR tickets: ${prTickets.length}, DD tickets: ${ddTickets.length}`)
    
    // Process tickets with instance information
    const processedTickets1 = prTickets.map(ticket => processTicket(ticket, 'platinum'))
    const processedTickets2 = ddTickets.map(ticket => processTicket(ticket, 'devicedoctor'))
    const processedTickets = [...processedTickets1, ...processedTickets2]
    
    console.log(`🔍 Processed tickets: PR: ${processedTickets1.length}, DD: ${processedTickets2.length}`)
    
    // Apply technician filtering for Device Doctor tickets
    let filteredTickets = processedTickets.filter(ticket => {
      if (ticket.ticketType === 'DD') {
        // Find the original ticket from the DD API response
        const originalTicket = ddTickets.find(t => 
          String(t.number || t.id) === String(ticket.ticketNumber)
        )
        
        const assignedTo = originalTicket?.user?.full_name
        
        // Exclude if assigned to excluded workshops
        if (assignedTo && excludedWorkshops.includes(assignedTo)) {
          console.log(`🚫 Excluding DD ticket ${ticket.ticketNumber} - assigned to excluded workshop: ${assignedTo}`)
          return false
        }
        
        // Only include if assigned to allowed technicians or unassigned
        if (assignedTo && !allowedTechnicians.includes(assignedTo)) {
          console.log(`🚫 Excluding DD ticket ${ticket.ticketNumber} - assigned to non-allowed technician: ${assignedTo}`)
          return false
        }
        
        // Also exclude specific technicians
        if (assignedTo && excludedTechnicians.includes(assignedTo)) {
          console.log(`🚫 Excluding DD ticket ${ticket.ticketNumber} - assigned to excluded technician: ${assignedTo}`)
          return false
        }
        
        console.log(`✅ Including DD ticket ${ticket.ticketNumber} - assigned to: ${assignedTo || 'Unassigned'}`)
      }
      
      // Include all Platinum Repairs tickets (no filtering needed)
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
