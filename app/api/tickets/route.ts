import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper function to extract device info from description using AI
async function extractDeviceInfo(description: string, fullTicketData?: any): Promise<string> {
  try {
    // Import the device detection function
    const { getCachedDeviceDetection } = await import('@/lib/device-detection')
    const result = await getCachedDeviceDetection(description, fullTicketData)
    
    // Only use AI result if confidence is high enough
    if (result.confidence > 0.6) {
      return result.deviceName
    }
    
    // Fallback: try to extract device info from description manually
    const devicePatterns = [
      /iPhone\s+\d+/i,
      /Samsung\s+Galaxy\s+[A-Z0-9\s]+/i,
      /iPad\s+[A-Z0-9\s]+/i,
      /MacBook\s+[A-Z0-9\s]+/i,
      /Huawei\s+[A-Z0-9\s]+/i,
      /HONOR\s+[A-Z0-9\s]+/i,
      /Asus\s+[A-Z0-9\s]+/i,
      /Device\s+([A-Za-z0-9\s]+)/i
    ]
    
    for (const pattern of devicePatterns) {
      const match = description.match(pattern)
      if (match) {
        return match[0].trim()
      }
    }
    
    return 'Unknown Device'
  } catch (error) {
    console.error('Error extracting device info:', error)
    return 'Unknown Device'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Fetch tickets from both PR and DD RepairShopr instances
    const [prTickets, ddTickets] = await Promise.all([
      fetchPRTickets(),
      fetchDDTickets()
    ])

    // Combine and process tickets
    const allTickets = [...prTickets, ...ddTickets]
    
    // Debug: Log all statuses to see what's coming through
    const allStatuses = allTickets.map(t => t.status)
    const uniqueStatuses = [...new Set(allStatuses)]
    console.log('🔍 All ticket statuses:', uniqueStatuses)
    
    // Filter to only include the 5 specific statuses we want
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress']
    const filteredTickets = allTickets.filter(ticket => allowedStatuses.includes(ticket.status))
    console.log('🔍 Filtered tickets count:', filteredTickets.length, 'out of', allTickets.length)
    
    // Get existing tickets from database to check assignments
    const { data: existingTickets } = await supabaseAdmin
      .from('repair_shopper_tickets')
      .select('*')

    // Merge with database data
    const processedTickets = filteredTickets.map(ticket => {
      const existing = existingTickets?.find(et => 
        et.repair_shopper_id === ticket.id && et.company === ticket.company
      )
      
      return {
        ...ticket,
        // Prioritize RepairShopr assignment, fallback to database assignment
        assignedTo: ticket.assignedTo || existing?.assigned_to || null,
        dbId: existing?.id || null
      }
    })

    return NextResponse.json({ 
      tickets: processedTickets,
      total: processedTickets.length,
      unassigned: processedTickets.filter(t => !t.assignedTo).length
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

async function fetchPRTickets() {
  const token = process.env.REPAIRSHOPR_TOKEN
  console.log('🔍 Fetching PR tickets with token:', token ? 'Present' : 'Missing')
  
  const response = await fetch('https://platinumrepairs.repairshopr.com/api/v1/tickets', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    console.error('❌ PR API Error:', response.status, response.statusText)
    throw new Error('Failed to fetch PR tickets')
  }

  const data = await response.json()
  console.log('🔍 PR API Response:', data.tickets?.length || 0, 'tickets')
  
  // Debug: Log first ticket structure to see available fields
  if (data.tickets && data.tickets.length > 0) {
    console.log('🔍 PR Ticket structure:', Object.keys(data.tickets[0]))
    console.log('🔍 PR First ticket user data:', data.tickets[0].user)
    console.log('🔍 PR First ticket assigned_to data:', data.tickets[0].assigned_to)
  }
  const filteredTickets = data.tickets.filter((ticket: any) => 
    ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress'].includes(ticket.status)
  )
  
  const processedTickets = await Promise.all(filteredTickets.map(async (ticket: any) => ({
      id: ticket.id,
      ticketId: `PR #${ticket.number}`,
      ticketNumber: ticket.number,
      company: 'PR',
      description: ticket.subject || 'No description',
      status: ticket.status,
      timeAgo: getTimeAgo(ticket.created_at),
      deviceInfo: await extractDeviceInfo(ticket.subject || ticket.comment || 'No description', ticket),
      customerName: ticket.customer?.name || 'Unknown Customer',
      customerEmail: ticket.customer?.email,
      customerPhone: ticket.customer?.phone,
      priority: ticket.priority || 'normal',
      aiPriority: getAIPriority(ticket),
      estimatedTime: getEstimatedTime(ticket),
      ticketType: 'PR' as const,
      timestamp: new Date(ticket.updated_at || ticket.created_at),
      statusChangedAt: ticket.updated_at || ticket.created_at,
      assignedTo: ticket.user?.full_name || ticket.assigned_to?.name || null
    })))
    
    return processedTickets
}

async function fetchDDTickets() {
  const token = process.env.REPAIRSHOPR_TOKEN_DD
  console.log('🔍 Fetching DD tickets with token:', token ? 'Present' : 'Missing')
  
  const response = await fetch('https://devicedoctorsa.repairshopr.com/api/v1/tickets', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    console.error('❌ DD API Error:', response.status, response.statusText)
    throw new Error('Failed to fetch DD tickets')
  }

  const data = await response.json()
  console.log('🔍 DD API Response:', data.tickets?.length || 0, 'tickets')
  
  // Debug: Log first ticket structure to see available fields
  if (data.tickets && data.tickets.length > 0) {
    console.log('🔍 DD Ticket structure:', Object.keys(data.tickets[0]))
    console.log('🔍 DD First ticket user data:', data.tickets[0].user)
    console.log('🔍 DD First ticket assigned_to data:', data.tickets[0].assigned_to)
  }
  
  const filteredTickets = data.tickets.filter((ticket: any) => {
    // First filter by allowed statuses
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress']
    if (!allowedStatuses.includes(ticket.status)) return false
    
    // For DD tickets, exclude those assigned to specific workshops
    const assignedTo = ticket.assigned_to?.name || ticket.assigned_to || ''
    if (assignedTo === 'Durban Workshop' || assignedTo === 'Cape Town Workshop') {
      return false
    }
    
    return true
  })
  
  const processedTickets = await Promise.all(filteredTickets.map(async (ticket: any) => ({
    id: ticket.id,
    ticketId: `DD #${ticket.number}`,
    ticketNumber: ticket.number,
    company: 'DD',
    description: ticket.subject || 'No description',
    status: ticket.status,
    timeAgo: getTimeAgo(ticket.created_at),
    deviceInfo: await extractDeviceInfo(ticket.subject || ticket.comment || 'No description', ticket),
    customerName: ticket.customer?.name || 'Unknown Customer',
    customerEmail: ticket.customer?.email,
    customerPhone: ticket.customer?.phone,
    priority: ticket.priority || 'normal',
    aiPriority: getAIPriority(ticket),
    estimatedTime: getEstimatedTime(ticket),
    ticketType: 'DD' as const,
    timestamp: new Date(ticket.updated_at || ticket.created_at),
    statusChangedAt: ticket.updated_at || ticket.created_at,
    assignedTo: ticket.user?.full_name || ticket.assigned_to?.name || null
  })))
  
  return processedTickets
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

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const businessHours = calculateBusinessHours(date, now)
  return formatBusinessHours(businessHours)
}

function getAIPriority(ticket: any): string {
  const businessHours = calculateBusinessHours(new Date(ticket.created_at), new Date())
  if (businessHours > 24) return 'P1'
  if (businessHours > 12) return 'P2'
  if (businessHours > 6) return 'P3'
  return 'P4'
}

function getEstimatedTime(ticket: any): string {
  const deviceInfo = ticket.device_info?.toLowerCase() || ''
  if (deviceInfo.includes('iphone') || deviceInfo.includes('samsung')) return '2h'
  if (deviceInfo.includes('laptop') || deviceInfo.includes('macbook')) return '4h'
  if (deviceInfo.includes('desktop')) return '3h'
  return '2h'
}