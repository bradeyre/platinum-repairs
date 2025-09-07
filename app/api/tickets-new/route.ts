import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function GET() {
  try {
    console.log('🚀 New tickets API called - fetching tickets...')
    
    const tickets = await getAllTickets()
    
    console.log(`✅ New API returning ${tickets.length} tickets`)
    console.log(`🔍 Sample ticket:`, tickets[0] ? {
      ticketId: tickets[0].ticketId,
      ticketNumber: tickets[0].ticketNumber,
      ticketType: tickets[0].ticketType,
      status: tickets[0].status
    } : 'No tickets')
    
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('❌ Error in new tickets API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
