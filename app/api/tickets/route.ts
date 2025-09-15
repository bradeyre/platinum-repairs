import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
        assignedTo: existing?.assigned_to || null,
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
  return data.tickets
    .filter((ticket: any) => 
      ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress'].includes(ticket.status)
    )
    .map((ticket: any) => ({
      id: ticket.id,
      ticketId: `PR #${ticket.number}`,
      ticketNumber: ticket.number,
      company: 'PR',
      description: ticket.subject || 'No description',
      status: ticket.status,
      timeAgo: getTimeAgo(ticket.created_at),
      deviceInfo: ticket.device_info || 'Unknown Device',
      customerName: ticket.customer?.name || 'Unknown Customer',
      customerEmail: ticket.customer?.email,
      customerPhone: ticket.customer?.phone,
      priority: ticket.priority || 'normal',
      aiPriority: getAIPriority(ticket),
      estimatedTime: getEstimatedTime(ticket),
      ticketType: 'PR' as const,
      statusChangedAt: ticket.updated_at || ticket.created_at
    }))
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
  return data.tickets
    .filter((ticket: any) => {
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
    .map((ticket: any) => ({
      id: ticket.id,
      ticketId: `DD #${ticket.number}`,
      ticketNumber: ticket.number,
      company: 'DD',
      description: ticket.subject || 'No description',
      status: ticket.status,
      timeAgo: getTimeAgo(ticket.created_at),
      deviceInfo: ticket.device_info || 'Unknown Device',
      customerName: ticket.customer?.name || 'Unknown Customer',
      customerEmail: ticket.customer?.email,
      customerPhone: ticket.customer?.phone,
      priority: ticket.priority || 'normal',
      aiPriority: getAIPriority(ticket),
      estimatedTime: getEstimatedTime(ticket),
      ticketType: 'DD' as const,
      statusChangedAt: ticket.updated_at || ticket.created_at
    }))
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes}m ago`
  }
}

function getAIPriority(ticket: any): string {
  const hours = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60))
  if (hours > 24) return 'P1'
  if (hours > 12) return 'P2'
  if (hours > 6) return 'P3'
  return 'P4'
}

function getEstimatedTime(ticket: any): string {
  const deviceInfo = ticket.device_info?.toLowerCase() || ''
  if (deviceInfo.includes('iphone') || deviceInfo.includes('samsung')) return '2h'
  if (deviceInfo.includes('laptop') || deviceInfo.includes('macbook')) return '4h'
  if (deviceInfo.includes('desktop')) return '3h'
  return '2h'
}