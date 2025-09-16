import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Using proven getAllTickets() function from repairshopr-new.ts')
    
    // Use the exact same working approach as getAllTickets function
    const allTickets = await getAllTickets()
    
    console.log('🔍 Total tickets from getAllTickets():', allTickets.length)
    
    // Get existing tickets from database to check assignments
    const { data: existingTickets } = await supabaseAdmin
      .from('repair_shopper_tickets')
      .select('*')

    // Merge with database data
    const processedTickets = allTickets.map(ticket => {
      const existing = existingTickets?.find(et => 
        et.repair_shopper_id === ticket.ticketNumber && et.company === ticket.ticketType
      )
      
      return {
        ...ticket,
        // Prioritize RepairShopr assignment, fallback to database assignment
        assignedTo: ticket.assignedTo || existing?.assigned_to || null,
        dbId: existing?.id || null
      }
    })

    console.log('🔍 Final processed tickets count:', processedTickets.length)
    
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