export interface RepairShoprTicket {
  id: string
  problem_type: string
  status: string
  created_at: string
  updated_at: string
  customer_business_then_name: string
  location_name: string
  user_id: number | null
  assets: Array<{
    name: string
    asset_type_name: string
  }>
}

export interface ProcessedTicket {
  ticketId: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'DR' | 'OUT' | 'PPS'
}

// RepairShopr API configuration
const REPAIRSHOPR_BASE_URL = 'https://platinumrepairs.repairshopr.com/api/v1'
const REPAIRSHOPR_DD_BASE_URL = 'https://devicedoctor.repairshopr.com/api/v1'

// Status mappings from RepairShopr to our 5 statuses
const STATUS_MAPPING: Record<string, string> = {
  'New': 'Awaiting Damage Report',
  'In Progress': 'In Progress', 
  'Waiting on Customer': 'Awaiting Rework',
  'Waiting on Parts': 'Awaiting Workshop Repairs',
  'Ready for Pickup': 'Awaiting Repair',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled'
}

// Function to calculate time ago in business hours
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const minutes = Math.floor(diffInMs / (1000 * 60))
    return `${minutes} minutes ago`
  } else if (diffInHours < 24) {
    return `${diffInHours.toFixed(1)} business hours ago`
  } else {
    const days = Math.floor(diffInHours / 24)
    return `${days} days ago`
  }
}

// Function to determine ticket type based on problem_type or other criteria
function getTicketType(problemType: string, locationName?: string): 'DR' | 'OUT' | 'PPS' {
  const type = problemType.toLowerCase()
  if (type.includes('damage') || type.includes('dr')) return 'DR'
  if (type.includes('out') || type.includes('outsourced')) return 'OUT'
  return 'PPS' // Default to PPS
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
function processTicket(ticket: RepairShoprTicket): ProcessedTicket {
  const deviceInfo = ticket.assets?.[0] 
    ? `${ticket.assets[0].name} (${ticket.assets[0].asset_type_name})`
    : 'Unknown Device'
    
  return {
    ticketId: `#${ticket.id}`,
    description: ticket.problem_type,
    status: STATUS_MAPPING[ticket.status] || ticket.status,
    timeAgo: getTimeAgo(ticket.updated_at),
    timestamp: new Date(ticket.updated_at),
    deviceInfo,
    assignedTo: ticket.user_id ? 'Ben' : undefined, // Map user IDs to names as needed
    aiPriority: 'P4', // Default priority, could be enhanced
    estimatedTime: '2h', // Default estimate, could be calculated
    ticketType: getTicketType(ticket.problem_type, ticket.location_name)
  }
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
    
    // Combine and process all tickets
    const allTickets = [...tickets1, ...tickets2]
    const processedTickets = allTickets.map(processTicket)
    
    // Sort by status priority and timestamp
    const statusPriority: Record<string, number> = {
      'Awaiting Rework': 1,
      'Awaiting Workshop Repairs': 2, 
      'Awaiting Damage Report': 3,
      'Awaiting Repair': 4,
      'In Progress': 5
    }
    
    return processedTickets.sort((a, b) => {
      const statusDiff = (statusPriority[a.status] || 999) - (statusPriority[b.status] || 999)
      if (statusDiff !== 0) return statusDiff
      return a.timestamp.getTime() - b.timestamp.getTime()
    })
    
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return []
  }
}