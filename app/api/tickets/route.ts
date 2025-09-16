import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Using proven getAllTickets() function from repairshopr-new.ts')
    
    // Use the exact same working approach as getAllTickets function
    const allTickets = await getAllTickets()
    
    console.log('🔍 Total tickets from getAllTickets():', allTickets.length)
    
    // For now, we don't store ticket assignments in the database
    // In a full implementation, you would sync with RepairShopr and store assignments
    const processedTickets = allTickets.map(ticket => ({
      ...ticket,
      assignedTo: ticket.assignedTo || null, // Use RepairShopr assignment if available
      dbId: null // No local database storage yet
    }))

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