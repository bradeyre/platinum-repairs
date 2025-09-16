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

// Extract timing information from admin notes
function extractTimingFromAdminNotes(ticket: any): Date | null {
  console.log(`🔍 Debugging ticket ${ticket.number}: Checking for admin notes...`)
  
  if (!ticket.comments || !Array.isArray(ticket.comments)) {
    console.log(`❌ Ticket ${ticket.number}: No comments array found`)
    return null
  }
  
  console.log(`📝 Ticket ${ticket.number}: Found ${ticket.comments.length} comments`)
  
  // Look for admin notes with timing information
  const adminNotes = ticket.comments.filter((comment: any) => {
    const isAdmin = comment.user?.role === 'admin' || 
                   comment.user?.role === 'manager' ||
                   comment.user?.username?.toLowerCase().includes('admin') ||
                   comment.user?.username?.toLowerCase().includes('manager')
    
    if (isAdmin) {
      console.log(`👤 Admin note found from ${comment.user?.username || 'unknown'}: ${(comment.body || comment.comment || '').substring(0, 100)}...`)
    }
    
    return isAdmin
  })
  
  console.log(`👥 Ticket ${ticket.number}: Found ${adminNotes.length} admin notes`)
  
  // Look for patterns like "Started at", "Work began", "Repair started", etc.
  const timingPatterns = [
    /started at (\d{1,2}:\d{2})/i,
    /work began at (\d{1,2}:\d{2})/i,
    /repair started at (\d{1,2}:\d{2})/i,
    /damage report started at (\d{1,2}:\d{2})/i,
    /began at (\d{1,2}:\d{2})/i,
    /started: (\d{1,2}:\d{2})/i,
    /time: (\d{1,2}:\d{2})/i
  ]
  
  for (const note of adminNotes) {
    const noteText = note.body || note.comment || ''
    console.log(`🔍 Checking note: "${noteText.substring(0, 200)}..."`)
    
    for (const pattern of timingPatterns) {
      const match = noteText.match(pattern)
      if (match) {
        const timeStr = match[1]
        const noteDate = new Date(note.created_at)
        const [hours, minutes] = timeStr.split(':').map(Number)
        
        // Create a date with the time from the note
        const timingDate = new Date(noteDate)
        timingDate.setHours(hours, minutes, 0, 0)
        
        console.log(`✅ Ticket ${ticket.number}: Found timing from admin note: ${timeStr} on ${noteDate.toDateString()}`)
        return timingDate
      }
    }
  }
  
  console.log(`❌ Ticket ${ticket.number}: No timing patterns found in admin notes`)
  return null
}

// Calculate time since last status change (more accurate for waiting time)
function getTimeSinceStatusChange(ticket: any): string {
  console.log(`⏰ Calculating timing for ticket ${ticket.number}...`)
  
  // First, try to get timing from admin notes (for tickets not using our system)
  const adminTiming = extractTimingFromAdminNotes(ticket)
  if (adminTiming) {
    const now = new Date()
    const businessHours = calculateBusinessHours(adminTiming, now)
    const result = formatBusinessHours(businessHours)
    console.log(`✅ Ticket ${ticket.number}: Using admin timing - ${result}`)
    return result
  }
  
  // If ticket has status changes, use the most recent one
  if (ticket.status_changes && ticket.status_changes.length > 0) {
    console.log(`📊 Ticket ${ticket.number}: Using status changes (${ticket.status_changes.length} changes)`)
    // Sort by created_at and get the most recent status change
    const sortedChanges = ticket.status_changes.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastStatusChange = sortedChanges[0]
    const statusChangeDate = new Date(lastStatusChange.created_at)
    const now = new Date()
    const businessHours = calculateBusinessHours(statusChangeDate, now)
    const result = formatBusinessHours(businessHours)
    console.log(`📊 Ticket ${ticket.number}: Using status change timing - ${result} (from ${lastStatusChange.status})`)
    return result
  }
  
  // Fallback to ticket creation date if no status changes
  console.log(`📅 Ticket ${ticket.number}: Using creation date fallback`)
  return getTimeAgo(ticket.created_at)
}

function getAIPriority(ticket: any): string {
  // Use status change time for more accurate priority calculation
  let referenceDate = new Date(ticket.created_at)
  
  // First, try to get timing from admin notes (for tickets not using our system)
  const adminTiming = extractTimingFromAdminNotes(ticket)
  if (adminTiming) {
    referenceDate = adminTiming
  } else if (ticket.status_changes && ticket.status_changes.length > 0) {
    const sortedChanges = ticket.status_changes.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    referenceDate = new Date(sortedChanges[0].created_at)
  }
  
  const businessHours = calculateBusinessHours(referenceDate, new Date())
  if (businessHours > 24) return 'P1'
  if (businessHours > 12) return 'P2'
  if (businessHours > 6) return 'P3'
  return 'P4'
}

function getEstimatedTime(ticket: any): string {
  return '2h' // Default estimated time
}

async function fetchPRTickets() {
  const token = process.env.REPAIRSHOPR_TOKEN
  console.log('🔍 Fetching PR tickets with token:', token ? 'Present' : 'Missing')
  
  const response = await fetch('https://platinumrepairs.repairshopr.com/api/v1/tickets?expand[]=status_changes&expand[]=comments', {
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
  
  // Debug: Check if comments are included in the response
  if (data.tickets && data.tickets.length > 0) {
    const sampleTicket = data.tickets[0]
    console.log('🔍 Sample ticket structure:', {
      hasComments: !!sampleTicket.comments,
      commentsCount: sampleTicket.comments?.length || 0,
      hasStatusChanges: !!sampleTicket.status_changes,
      statusChangesCount: sampleTicket.status_changes?.length || 0
    })
  }
  
  const filteredTickets = data.tickets.filter((ticket: any) => 
    ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress', 'Awaiting Walk-in Repair', 'Awaiting Walk-in DR'].includes(ticket.status)
  )
  
  const processedTickets = await Promise.all(filteredTickets.map(async (ticket: any) => ({
    id: ticket.id,
    ticketId: `PR #${ticket.number}`,
    ticketNumber: ticket.number,
    company: 'PR',
    description: ticket.subject || 'No description',
    status: ticket.status,
    timeAgo: getTimeSinceStatusChange(ticket),
    deviceInfo: await extractDeviceInfo(ticket.subject || ticket.comment || 'No description', ticket),
    customerName: ticket.customer?.name || 'Unknown Customer',
    customerEmail: ticket.customer?.email,
    customerPhone: ticket.customer?.phone,
    priority: ticket.priority || 'normal',
    aiPriority: getAIPriority(ticket),
    estimatedTime: getEstimatedTime(ticket),
    ticketType: 'PR' as const,
    timestamp: new Date(ticket.created_at),
    statusChangedAt: ticket.updated_at || ticket.created_at,
    assignedTo: ticket.user?.full_name || ticket.assigned_to?.name || null
  })))
  
  return processedTickets
}

async function fetchDDTickets() {
  const token = process.env.REPAIRSHOPR_TOKEN_DD
  console.log('🔍 Fetching DD tickets with token:', token ? 'Present' : 'Missing')
  
  const response = await fetch('https://devicedoctorsa.repairshopr.com/api/v1/tickets?expand[]=status_changes&expand[]=comments', {
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
  
  const filteredTickets = data.tickets.filter((ticket: any) => {
    // First filter by allowed statuses
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress', 'Awaiting Walk-in Repair', 'Awaiting Walk-in DR']
    if (!allowedStatuses.includes(ticket.status)) return false
    
    // For DD tickets, exclude those assigned to specific workshops
    // Check multiple possible assignment fields
    const assignedTo = ticket.assigned_to?.name || ticket.assigned_to || ticket.user?.full_name || ''
    if (assignedTo === 'Durban Workshop' || assignedTo === 'Cape Town Workshop') {
      console.log(`🚫 Filtering out DD ticket ${ticket.number} assigned to: ${assignedTo}`)
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
    timeAgo: getTimeSinceStatusChange(ticket),
    deviceInfo: await extractDeviceInfo(ticket.subject || ticket.comment || 'No description', ticket),
    customerName: ticket.customer?.name || 'Unknown Customer',
    customerEmail: ticket.customer?.email,
    customerPhone: ticket.customer?.phone,
    priority: ticket.priority || 'normal',
    aiPriority: getAIPriority(ticket),
    estimatedTime: getEstimatedTime(ticket),
    ticketType: 'DD' as const,
    timestamp: new Date(ticket.created_at),
    statusChangedAt: ticket.updated_at || ticket.created_at,
    assignedTo: ticket.user?.full_name || ticket.assigned_to?.name || null
  })))

  // Map workshop assignments to specific technicians
  const finalFilteredTickets = processedTickets.map(ticket => {
    if (ticket.assignedTo === 'Durban Workshop') {
      console.log(`🔄 Mapping Durban Workshop ticket ${ticket.ticketNumber} to Thasveer`)
      return { ...ticket, assignedTo: 'Thasveer' }
    }
    if (ticket.assignedTo === 'Cape Town Workshop') {
      console.log(`🔄 Mapping Cape Town Workshop ticket ${ticket.ticketNumber} to Reece`)
      return { ...ticket, assignedTo: 'Reece' }
    }
    return ticket
  })
  
  return finalFilteredTickets
}

export async function GET(request: NextRequest) {
  try {
    // Fetch tickets from both PR and DD RepairShopr instances with timeout protection
    const [prTickets, ddTickets] = await Promise.all([
      fetchPRTickets(),
      fetchDDTickets()
    ])

    // Combine and process tickets
    const allTickets = [...prTickets, ...ddTickets]
    console.log('🔍 Total tickets after combining:', allTickets.length)
    console.log('🔍 PR tickets:', prTickets.length, 'DD tickets:', ddTickets.length)
    
    // Debug: Log all statuses to see what's coming through
    const allStatuses = allTickets.map(t => t.status)
    const uniqueStatuses = [...new Set(allStatuses)]
    console.log('🔍 All ticket statuses:', uniqueStatuses)
    
    // Get existing tickets from database to check assignments
    const { data: existingTickets } = await supabaseAdmin
      .from('repair_shopper_tickets')
      .select('*')

    // Merge with database data
    const processedTickets = allTickets.map(ticket => {
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

    console.log('🔍 Final processed tickets count:', processedTickets.length)
    console.log('🔍 Tickets assigned to Ben:', processedTickets.filter(t => t.assignedTo?.toLowerCase() === 'ben').length)
    
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