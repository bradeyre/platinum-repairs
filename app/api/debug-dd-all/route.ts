import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN_DD
    const baseUrl = 'https://devicedoctorsa.repairshopr.com/api/v1'
    
    if (!token) {
      return NextResponse.json({ error: 'DD token not found' }, { status: 500 })
    }
    
    const url = `${baseUrl}/tickets?api_key=${token}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: `API error: ${response.status} - ${errorText}` }, { status: 500 })
    }
    
    const data = await response.json()
    const allTickets = data.tickets || []
    
    // Get all tickets with their statuses and numbers
    const ticketsWithStatuses = allTickets.map((ticket: any) => ({
      number: ticket.number,
      status: ticket.status,
      subject: ticket.subject?.substring(0, 50) + '...',
      assignedTo: ticket.user?.full_name || 'Unassigned'
    }))
    
    // Count tickets by status
    const statusCounts = ticketsWithStatuses.reduce((acc: any, ticket: any) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1
      return acc
    }, {})
    
    return NextResponse.json({
      success: true,
      totalTickets: allTickets.length,
      statusCounts,
      ticketsWithStatuses: ticketsWithStatuses.slice(0, 20) // First 20 tickets
    })
  } catch (error) {
    console.error('Error in debug-dd-all API:', error)
    return NextResponse.json({ error: 'Failed to debug DD API', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}



