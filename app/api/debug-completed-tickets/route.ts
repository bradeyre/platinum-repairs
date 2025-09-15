import { NextRequest, NextResponse } from 'next/server'
import { getAllCompletedTickets } from '@/lib/repairshopr-new'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Testing completed tickets fetch...')
    
    const completedTickets = await getAllCompletedTickets()
    
    console.log(`🔍 Debug: Found ${completedTickets.length} completed tickets`)
    
    return NextResponse.json({
      success: true,
      totalTickets: completedTickets.length,
      tickets: completedTickets.slice(0, 5), // Show first 5 tickets for debugging
      sampleTicket: completedTickets[0] || null
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}


