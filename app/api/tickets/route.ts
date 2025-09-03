import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr'

export async function GET() {
  try {
    const tickets = await getAllTickets()
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error in tickets API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' // Ensure fresh data on each request