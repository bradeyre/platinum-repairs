import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr'

export async function GET() {
  try {
    console.log('🔍 Testing workshop filtering...')
    
    const tickets = await getAllTickets()
    const ddTickets = tickets.filter(t => t.ticketType === 'DD')
    
    console.log(`🔍 Total tickets: ${tickets.length}`)
    console.log(`🔍 DD tickets: ${ddTickets.length}`)
    console.log(`🔍 DD ticket numbers:`, ddTickets.map(t => t.ticketNumber))
    
    return NextResponse.json({
      success: true,
      totalTickets: tickets.length,
      ddTickets: ddTickets.length,
      ddTicketNumbers: ddTickets.map(t => t.ticketNumber),
      allTickets: tickets.map(t => ({
        ticketNumber: t.ticketNumber,
        ticketType: t.ticketType,
        status: t.status
      }))
    })
    
  } catch (error) {
    console.error('❌ Workshop filtering test error:', error)
    return NextResponse.json({ 
      error: 'Workshop filtering test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

