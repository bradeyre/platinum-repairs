import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { ticketId, technician } = await request.json()

    if (!ticketId || !technician) {
      return NextResponse.json(
        { error: 'Missing ticketId or technician' },
        { status: 400 }
      )
    }

    // Get technician user ID
    const { data: techUser, error: techError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', technician)
      .single()

    if (techError || !techUser) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
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
    const repairShopperId = parseInt(ticketNumber)

    // Check if ticket exists in database
    const { data: existingTicket, error: ticketError } = await supabaseAdmin
      .from('repair_shopper_tickets')
      .select('*')
      .eq('repair_shopper_id', repairShopperId)
      .eq('company', company)
      .single()

    let ticketDbId: string

    if (ticketError && ticketError.code === 'PGRST116') {
      // Ticket doesn't exist, create it
      const { data: newTicket, error: createError } = await supabaseAdmin
        .from('repair_shopper_tickets')
        .insert({
          repair_shopper_id: repairShopperId,
          company: company as 'PR' | 'DD',
          ticket_number: ticketNumber,
          assigned_to: techUser.id,
          status: 'assigned'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating ticket:', createError)
        return NextResponse.json(
          { error: 'Failed to create ticket record' },
          { status: 500 }
        )
      }

      ticketDbId = newTicket.id
    } else if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 }
      )
    } else {
      // Update existing ticket
      const { error: updateError } = await supabaseAdmin
        .from('repair_shopper_tickets')
        .update({
          assigned_to: techUser.id,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTicket.id)

      if (updateError) {
        console.error('Error updating ticket:', updateError)
        return NextResponse.json(
          { error: 'Failed to update ticket' },
          { status: 500 }
        )
      }

      ticketDbId = existingTicket.id
    }

    // Create assignment record
    const { error: assignmentError } = await supabaseAdmin
      .from('ticket_assignments')
      .insert({
        ticket_id: ticketDbId,
        technician_id: techUser.id,
        status: 'assigned'
      })

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: `Ticket ${ticketId} assigned to ${technician}`,
      assignment: {
        ticketId: ticketDbId,
        technicianId: techUser.id,
        technician: technician
      }
    })
  } catch (error) {
    console.error('Error assigning ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}