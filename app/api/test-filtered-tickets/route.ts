import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function GET() {
  try {
    console.log('🧪 Testing filtered tickets API...')
    
    const tickets = await getAllTickets()
    
    // Analyze the results
    const analysis = {
      totalTickets: tickets.length,
      byType: {
        PR: tickets.filter(t => t.ticketType === 'PR').length,
        DD: tickets.filter(t => t.ticketType === 'DD').length
      },
      byStatus: tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byTechnician: tickets.reduce((acc, ticket) => {
        const tech = ticket.assignedTo || 'Unassigned'
        acc[tech] = (acc[tech] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      sampleTickets: tickets.slice(0, 5).map(ticket => ({
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        ticketType: ticket.ticketType,
        description: ticket.description.substring(0, 100) + '...'
      }))
    }
    
    console.log('📊 Filtered tickets analysis:', analysis)
    
    return NextResponse.json({
      success: true,
      analysis,
      tickets: tickets.slice(0, 10) // Return first 10 tickets for inspection
    })
  } catch (error) {
    console.error('❌ Error testing filtered tickets:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test filtered tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

