import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Use the working getAllTickets function from repairshopr-new.ts
    const { getAllTickets } = await import('@/lib/repairshopr-new')
    const allTickets = await getAllTickets()
    
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