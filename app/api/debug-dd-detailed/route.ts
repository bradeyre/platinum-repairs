import { NextResponse } from 'next/server'

interface RepairShoprTicket {
  number: string
  status: string
  subject?: string
  user?: {
    full_name?: string
  }
}

export async function GET() {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN_DD
    const baseUrl = 'https://devicedoctorsa.repairshopr.com/api/v1'
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'Awaiting Authorization', 'In Progress']

    if (!token) {
      return NextResponse.json({ success: false, error: 'Device Doctor token not found' }, { status: 500 })
    }

    const response = await fetch(`${baseUrl}/tickets?api_key=${token}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ success: false, error: `API error: ${response.status} - ${errorText}` }, { status: 500 })
    }

    const data = await response.json()
    const allTickets: RepairShoprTicket[] = data.tickets || []
    
    // Filter tickets with allowed statuses
    const filteredTickets = allTickets.filter((ticket: RepairShoprTicket) => allowedStatuses.includes(ticket.status))
    
    // Get detailed info for each filtered ticket
    const detailedTickets = filteredTickets.map((ticket: RepairShoprTicket) => ({
      ticketNumber: ticket.number,
      status: ticket.status,
      assignedTo: ticket.user?.full_name || 'Unassigned',
      subject: ticket.subject?.substring(0, 100) + '...',
      shouldBeFiltered: ticket.user?.full_name && ['Durban Workshop', 'Cape Town Workshop'].includes(ticket.user.full_name)
    }))

    return NextResponse.json({
      success: true,
      totalTickets: allTickets.length,
      filteredTickets: filteredTickets.length,
      detailedTickets,
      summary: {
        total: detailedTickets.length,
        shouldBeFiltered: detailedTickets.filter(t => t.shouldBeFiltered).length,
        shouldShow: detailedTickets.filter(t => !t.shouldBeFiltered).length
      }
    })
  } catch (error) {
    console.error('Error in debug-dd-detailed API:', error)
    return NextResponse.json({ success: false, error: 'Failed to debug DD API', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

