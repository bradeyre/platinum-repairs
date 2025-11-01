import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Available technicians
const TECHNICIANS = ['Ben', 'Marshal', 'Malvin', 'Francis']

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

    if (!TECHNICIANS.includes(technician)) {
      return NextResponse.json(
        { error: 'Invalid technician' },
        { status: 400 }
      )
    }

    // Parse ticket info from ticketId (format: "PR #12345" or "DD #12345")
    const match = ticketId.match(/(PR|DD) #(\d+)/)
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid ticket ID format' },
        { status: 400 }
      )
    }

    const [, company, ticketNumber] = match

    // Get technician user ID from database for validation
    const { data: techUser, error: techError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name')
      .eq('username', technician.toLowerCase())
      .single()

    if (techError || !techUser) {
      console.error('Technician not found:', technician, techError)
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      )
    }

    // Log the assignment for debugging
    console.log(`🎯 Ticket Assignment: ${ticketId} → ${technician} (${techUser.full_name || techUser.username})`)
    
    // Here you would normally update RepairShopr via API
    // For now, we'll just log the assignment (in production, sync with RepairShopr)
    console.log(`Assigning ticket ${ticketId} to ${technician}`)
    
    // In a real implementation, you would:
    // 1. Update RepairShopr ticket assignment via API
    // 2. Store the assignment in your database
    // 3. Return success/failure

    return NextResponse.json({ 
      success: true,
      message: `Ticket ${ticketId} assigned to ${technician}`,
      assignment: {
        ticketId: ticketId,
        technicianId: techUser.id,
        technician: technician,
        technicianName: techUser.full_name || techUser.username,
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