import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr'

export async function GET() {
  try {
    console.log('🚀 API route called - fetching tickets...')
    console.log('🔍 Environment check:')
    console.log('REPAIRSHOPR_TOKEN:', process.env.REPAIRSHOPR_TOKEN ? 'Present' : 'Missing')
    console.log('REPAIRSHOPR_TOKEN_DD:', process.env.REPAIRSHOPR_TOKEN_DD ? 'Present' : 'Missing')
    
    const tickets = await getAllTickets()
    console.log(`✅ API returning ${tickets.length} tickets`)
    console.log('🔍 Sample ticket:', tickets[0] ? {
      ticketId: tickets[0].ticketId,
      ticketNumber: tickets[0].ticketNumber,
      ticketType: tickets[0].ticketType
    } : 'No tickets')
    
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('❌ Error in tickets API:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' // Ensure fresh data on each request