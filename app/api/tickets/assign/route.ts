import { NextResponse } from 'next/server'

// Available technicians
const TECHNICIANS = ['Ben', 'Alex', 'Sarah', 'Mike']

export async function POST(request: Request) {
  try {
    const { ticketId, technician } = await request.json()
    
    if (!ticketId || !technician) {
      return NextResponse.json(
        { error: 'Missing ticketId or technician' },
        { status: 400 }
      )
    }
    
    if (!TECHNICIANS.includes(technician)) {
      return NextResponse.json(
        { error: 'Invalid technician' },
        { status: 400 }
      )
    }
    
    // Here you would normally update RepairShopr via API
    // For now, we'll store assignments locally (in production, sync with RepairShopr)
    console.log(`Assigning ticket ${ticketId} to ${technician}`)
    
    // In a real implementation, you would:
    // 1. Update RepairShopr ticket assignment via API
    // 2. Store the assignment in your database
    // 3. Return success/failure
    
    return NextResponse.json({ 
      success: true, 
      message: `Ticket ${ticketId} assigned to ${technician}` 
    })
    
  } catch (error) {
    console.error('Error assigning ticket:', error)
    return NextResponse.json(
      { error: 'Failed to assign ticket' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'