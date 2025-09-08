import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN_DD
    const baseUrl = 'https://devicedoctorsa.repairshopr.com/api/v1'
    const targetStatuses = [
      'Awaiting Rework',
      'Awaiting Workshop Repairs', 
      'Awaiting Damage Report',
      'Awaiting Repair',
      'In Progress'
    ]
    const allowedTechnicians = ['Marshal', 'Malvin', 'Francis', 'Ben']
    const excludedTechnicians = ['Thasveer', 'Shannon'] // Additional technicians to exclude
    const excludedWorkshops = ['Durban Workshop', 'Cape Town Workshop']

    if (!token) {
      return NextResponse.json({ success: false, error: 'Device Doctor token not found' }, { status: 500 })
    }

    console.log('🔍 Testing Device Doctor API with new filtering approach...')

    // Fetch tickets for each status
    const allTickets: any[] = []
    for (const status of targetStatuses) {
      try {
        const response = await fetch(`${baseUrl}/tickets?status=${encodeURIComponent(status)}&api_key=${token}`, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${status} tickets: ${response.status}`)
          continue
        }

        const data = await response.json()
        const tickets = data.tickets || []
        console.log(`✅ Fetched ${tickets.length} tickets with status: ${status}`)
        allTickets.push(...tickets)
      } catch (error) {
        console.error(`❌ Error fetching ${status} tickets:`, error)
      }
    }

    console.log(`🔍 Total tickets fetched: ${allTickets.length}`)

    // Apply filtering
    const filteredTickets = allTickets.filter(ticket => {
      const assignedTo = ticket.user?.full_name
      
      // Exclude if assigned to excluded workshops
      if (assignedTo && excludedWorkshops.includes(assignedTo)) {
        console.log(`🚫 Excluding ticket ${ticket.number} - assigned to excluded workshop: ${assignedTo}`)
        return false
      }
      
      // Only include if assigned to allowed technicians or unassigned
      if (assignedTo && !allowedTechnicians.includes(assignedTo)) {
        console.log(`🚫 Excluding ticket ${ticket.number} - assigned to non-allowed technician: ${assignedTo}`)
        return false
      }
      
      // Also exclude specific technicians
      if (assignedTo && excludedTechnicians.includes(assignedTo)) {
        console.log(`🚫 Excluding ticket ${ticket.number} - assigned to excluded technician: ${assignedTo}`)
        return false
      }
      
      console.log(`✅ Including ticket ${ticket.number} - assigned to: ${assignedTo || 'Unassigned'}`)
      return true
    })

    // Analyze results
    const analysis = {
      totalFetched: allTickets.length,
      totalFiltered: filteredTickets.length,
      byStatus: allTickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byTechnician: allTickets.reduce((acc, ticket) => {
        const tech = ticket.user?.full_name || 'Unassigned'
        acc[tech] = (acc[tech] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      filteredByTechnician: filteredTickets.reduce((acc, ticket) => {
        const tech = ticket.user?.full_name || 'Unassigned'
        acc[tech] = (acc[tech] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      sampleFilteredTickets: filteredTickets.slice(0, 5).map(ticket => ({
        ticketNumber: ticket.number,
        status: ticket.status,
        assignedTo: ticket.user?.full_name || 'Unassigned',
        subject: ticket.subject?.substring(0, 100) + '...'
      }))
    }

    return NextResponse.json({
      success: true,
      analysis,
      message: `Successfully filtered ${filteredTickets.length} tickets from ${allTickets.length} total tickets`
    })
  } catch (error) {
    console.error('❌ Error in debug-dd-filtered API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to debug DD filtering',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
