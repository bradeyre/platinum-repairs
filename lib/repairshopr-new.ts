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

// Fetch tickets from RepairShopr using api_key query parameter (working method)
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

// Main function to get all tickets from both APIs
export async function getAllTickets(): Promise<ProcessedTicket[]> {
  const token1 = process.env.REPAIRSHOPR_TOKEN
  const token2 = process.env.REPAIRSHOPR_TOKEN_DD
  
  if (!token1 || !token2) {
    console.error('RepairShopr tokens not found in environment variables')
    return []
  }
  
  try {
    console.log('🚀 Starting to fetch tickets from both APIs...')
    
    // Fetch from both instances in parallel
    const [tickets1, tickets2] = await Promise.all([
      fetchFromRepairShopr(token1, REPAIRSHOPR_BASE_URL),
      fetchFromRepairShopr(token2, REPAIRSHOPR_DD_BASE_URL)
    ])
    
    console.log(`🔍 Raw API results: PR tickets: ${tickets1.length}, DD tickets: ${tickets2.length}`)
    
    // Process tickets with instance information
    const processedTickets1 = tickets1.map(ticket => processTicket(ticket, 'platinum'))
    const processedTickets2 = tickets2.map(ticket => processTicket(ticket, 'devicedoctor'))
    const processedTickets = [...processedTickets1, ...processedTickets2]
    
    console.log(`🔍 Processed tickets: PR: ${processedTickets1.length}, DD: ${processedTickets2.length}`)
    
    // Filter to ONLY show the 6 allowed statuses
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'Awaiting Authorization', 'In Progress']
    let activeTickets = processedTickets.filter(ticket => 
      allowedStatuses.includes(ticket.status)
    )
    
    console.log(`🔍 After status filtering: ${activeTickets.length} tickets`)
    console.log(`🔍 Active tickets by type:`, {
      PR: activeTickets.filter(t => t.ticketType === 'PR').length,
      DD: activeTickets.filter(t => t.ticketType === 'DD').length
    })
    
    // Workshop filtering: Exclude Device Doctor tickets assigned to specific workshops
    const excludedWorkshops = ['Durban Workshop', 'Cape Town Workshop']
    console.log(`🔍 Before workshop filtering: ${activeTickets.length} tickets`)
    
    activeTickets = activeTickets.filter(ticket => {
      if (ticket.ticketType === 'DD') {
        // Find the original ticket from the DD API response (tickets2)
        const originalTicket = tickets2.find(t => 
          String(t.number || t.id) === String(ticket.ticketNumber)
        )
        
        if (originalTicket?.user?.full_name && excludedWorkshops.includes(originalTicket.user.full_name)) {
          console.log(`🚫 Excluding DD ticket ${ticket.ticketNumber} - assigned to ${originalTicket.user.full_name}`)
          return false
        }
      }
      return true
    })
    
    console.log(`🔍 After workshop filtering: ${activeTickets.length} tickets`)
    console.log(`🔍 Final tickets by type:`, {
      PR: activeTickets.filter(t => t.ticketType === 'PR').length,
      DD: activeTickets.filter(t => t.ticketType === 'DD').length
    })
    
    return activeTickets
    
  } catch (error) {
    console.error('❌ Error in getAllTickets:', error)
    return []
  }
}
