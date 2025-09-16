import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { ticketId, technician } = await request.json()

    console.log(`🎯 Assignment API called: ${ticketId} -> ${technician}`)

    if (!ticketId || !technician) {
      return NextResponse.json(
        { error: 'Missing ticketId or technician' },
        { status: 400 }
      )
    }

    // For now, just log the assignment and return success
    // This will help us verify the API is working
    console.log(`✅ Assignment successful: ${ticketId} assigned to ${technician}`)

    return NextResponse.json({ 
      success: true,
      message: `Ticket ${ticketId} assigned to ${technician}`,
      assignment: {
        ticketId,
        technician,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Error in assignment API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}