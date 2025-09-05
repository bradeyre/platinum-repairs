export interface RepairShoprTicket {
  id: string
  number?: string  // Make optional - some APIs might not have this field
  problem_type: string
  status: string
  created_at: string
  updated_at: string
  customer_business_then_name: string
  location_name: string
  user_id: number | null
  subject: string
  comment: string
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

// RepairShopr API configuration
const REPAIRSHOPR_BASE_URL = 'https://platinumrepairs.repairshopr.com/api/v1'
const REPAIRSHOPR_DD_BASE_URL = 'https://devic_doctorsa.repairshopr.com/api/v1'

// Status mappings from RepairShopr to our 5 statuses
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
  'Call For Info/Courier to be Booked': 'Awaiting Damage Report',
  'Awaiting Courier Arrival': 'Awaiting Damage Report',
  'Awaiting Biker Collection': 'Awaiting Damage Report',
  'Awaiting Mobile Booking': 'Awaiting Damage Report',
  'Awaiting Walk-in': 'Awaiting Damage Report',
  
  // Awaiting Repair
  'Awaiting Authorization': 'Awaiting Repair',
  'Awaiting Virtual Assessment': 'Awaiting Repair',
  'No Parts': 'Awaiting Repair',
  
  // In Progress
  'In Progress': 'In Progress',
  'Damage Report Completed': 'In Progress',
  
  // Completed/Other (not shown in main view)
  'Resolved': 'Completed',
  'Closed File': 'Completed',
  'Salvage': 'Completed',
  'BER': 'Completed'
}

// Function to calculate time ago in business hours - simplified format
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
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

// Function to determine ticket type based on RepairShopr instance
function getTicketType(repairShoprInstance: 'platinum' | 'devicedoctor'): 'PR' | 'DD' {
  return repairShoprInstance === 'platinum' ? 'PR' : 'DD'
}

// Fetch tickets from RepairShopr instance
async function fetchFromRepairShopr(token: string, baseUrl: string): Promise<RepairShoprTicket[]> {
  try {
    // Try fetching all tickets first, then filter
    const url = `${baseUrl}/tickets`
    console.log(`Fetching from RepairShopr: ${url}`)
    console.log(`Using token: ${token.substring(0, 10)}...`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`RepairShopr response status: ${response.status}`)
    console.log(`RepairShopr response headers:`, Object.fromEntries(response.headers.entries()))
    console.log(`🔍 Fetching from: ${baseUrl.includes('devicedoctor') ? 'DEVICE DOCTOR' : 'PLATINUM REPAIRS'} API`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`RepairShopr API error: ${response.status} - ${errorText}`)
      throw new Error(`RepairShopr API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`RepairShopr response structure:`, Object.keys(data))
    console.log(`RepairShopr tickets count:`, data.tickets ? data.tickets.length : 'No tickets property')
    
    if (data.tickets && data.tickets.length > 0) {
      console.log(`Sample ticket:`, data.tickets[0])
    }
    
    return data.tickets || []
  } catch (error) {
    console.error('Error fetching from RepairShopr:', error)
    return []
  }
}

// Process RepairShopr ticket into our format
function processTicket(ticket: RepairShoprTicket, instance: 'platinum' | 'devicedoctor'): ProcessedTicket {
  // Extract device information from assets or subject
  let deviceInfo = 'Unknown Device'
  if (ticket.assets && ticket.assets.length > 0) {
    const asset = ticket.assets[0]
    if (asset.manufacturer && asset.model) {
      deviceInfo = `${asset.manufacturer} ${asset.model}`
    } else if (asset.name) {
      deviceInfo = asset.name
    } else {
      deviceInfo = asset.asset_type_name || 'Unknown Device'
    }
  } else if (ticket.subject) {
    // Extract device info from subject using basic AI-like parsing
    deviceInfo = extractDeviceFromText(ticket.subject)
  }

  // Create better description from subject and problem_type
  let description = ticket.problem_type || 'No description'
  if (ticket.subject && ticket.subject !== ticket.problem_type) {
    description = ticket.subject
  } else if (ticket.comment) {
    // Use first 100 characters of comment if subject is generic
    description = ticket.comment.substring(0, 100) + (ticket.comment.length > 100 ? '...' : '')
  }
    
  return {
    ticketId: `#${ticket.number || ticket.id}`, // Use ticket number if available, fallback to ID
    ticketNumber: ticket.number || ticket.id, // Use the actual ticket number from API, fallback to ID
    description,
    status: STATUS_MAPPING[ticket.status] || ticket.status,
    timeAgo: getTimeAgo(ticket.updated_at),
    timestamp: new Date(ticket.updated_at),
    deviceInfo,
    assignedTo: undefined, // Don't auto-assign - let actual assignments come from RepairShopr data
    aiPriority: 'P4', // Default priority, could be enhanced
    estimatedTime: '2h', // Default estimate, could be calculated
    ticketType: getTicketType(instance)
  }
}

// AI-like device extraction from text
function extractDeviceFromText(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Common device patterns
  const devicePatterns = [
    /iphone\s*(\d+\s*pro\s*max?|\d+\s*plus?|\d+)/i,
    /samsung\s*galaxy\s*[a-z]*\s*\d+/i,
    /macbook\s*(pro|air)?\s*\d*(\"|inch)?/i,
    /ipad\s*(pro|air|mini)?\s*\d*/i,
    /google\s*pixel\s*\d*/i,
    /surface\s*(pro|book|laptop)?\s*\d*/i,
    /dell\s*xps\s*\d*/i,
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

// Main function to get all tickets from both RepairShopr instances
export async function getAllTickets(): Promise<ProcessedTicket[]> {
  const token1 = process.env.REPAIRSHOPR_TOKEN
  const token2 = process.env.REPAIRSHOPR_TOKEN_DD
  
  if (!token1 || !token2) {
    console.error('RepairShopr tokens not found in environment variables')
    return []
  }
  
  try {
    // Fetch from both instances in parallel
    const [tickets1, tickets2] = await Promise.all([
      fetchFromRepairShopr(token1, REPAIRSHOPR_BASE_URL),
      fetchFromRepairShopr(token2, REPAIRSHOPR_DD_BASE_URL)
    ])
    
    // Process tickets with instance information
    const processedTickets1 = tickets1.map(ticket => processTicket(ticket, 'platinum'))
    const processedTickets2 = tickets2.map(ticket => processTicket(ticket, 'devicedoctor'))
    const processedTickets = [...processedTickets1, ...processedTickets2]
    
    console.log(`🔍 API Debug: PR tickets: ${tickets1.length}, DD tickets: ${tickets2.length}`)
    console.log(`🔍 Processed: PR: ${processedTickets1.length}, DD: ${processedTickets2.length}`)
    
    // Debug: Show all statuses being returned
    const allStatuses = processedTickets.map(t => t.status)
    const uniqueStatuses = [...new Set(allStatuses)]
    console.log(`🔍 All statuses from APIs:`, uniqueStatuses)
    
    // Filter to ONLY show the 5 allowed statuses
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress']
    const activeTickets = processedTickets.filter(ticket => 
      allowedStatuses.includes(ticket.status)
    )
    
    console.log(`Filtered to ${activeTickets.length} active tickets from ${processedTickets.length} total`)
    console.log(`🔍 Active tickets by type:`, {
      PR: activeTickets.filter(t => t.ticketType === 'PR').length,
      DD: activeTickets.filter(t => t.ticketType === 'DD').length
    })
    
    // Sort by status priority and timestamp
    const statusPriority: Record<string, number> = {
      'Awaiting Rework': 1,
      'Awaiting Workshop Repairs': 2, 
      'Awaiting Damage Report': 3,
      'Awaiting Repair': 4,
      'In Progress': 5
    }
    
    return activeTickets.sort((a, b) => {
      const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999)
      if (statusDiff !== 0) return statusDiff
      return a.timestamp.getTime() - b.timestamp.getTime()
    })
    
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return []
  }
}