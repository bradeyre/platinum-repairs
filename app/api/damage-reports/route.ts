import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: reports, error } = await supabaseAdmin
      .from('damage_reports')
      .select(`
        *,
        repair_shopper_tickets (
          ticket_number,
          company,
          customer_name,
          device_info
        ),
        users (
          username,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching damage reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch damage reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error fetching damage reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ticketId, technicianId, deviceInfo, damageAssessment, repairEstimate, partsNeeded } = await request.json()

    if (!ticketId || !technicianId || !deviceInfo || !damageAssessment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .insert({
        ticket_id: ticketId,
        technician_id: technicianId,
        device_info: deviceInfo,
        damage_assessment: damageAssessment,
        repair_estimate: repairEstimate || 0,
        parts_needed: partsNeeded || [],
        status: 'in_progress'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating damage report:', error)
      return NextResponse.json(
        { error: 'Failed to create damage report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error creating damage report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
