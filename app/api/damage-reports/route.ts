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
    const reportData = await request.json()
    
    // Handle both old and new data structures
    const {
      ticket, // New format
      ticketId, // Old format
      technician, // New format
      technicianId, // Old format
      deviceInfo, // New format
      device_info, // Old format
      damageAssessment, // Old format
      repairEstimate, // Old format
      partsNeeded, // Old format
      suggestedParts, // New format
      status = 'completed', // New format defaults to completed
      timeSpent,
      aiAnalysis,
      dynamicCheckboxes,
      additionalNotes,
      deviceType,
      make,
      model,
      claim,
      lastUsed,
      deviceRepairable,
      repairExplanation,
      photos
    } = reportData

    // Extract ticket ID and technician info
    const finalTicketId = ticket || ticketId
    const finalTechnician = technician || technicianId
    const finalDeviceInfo = deviceInfo || device_info
    const finalDamageAssessment = damageAssessment || additionalNotes || 'Damage assessment completed'
    const finalPartsNeeded = suggestedParts || partsNeeded || []
    const finalRepairEstimate = repairEstimate || 0

    if (!finalTicketId || !finalTechnician || !finalDeviceInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: ticket, technician, deviceInfo' },
        { status: 400 }
      )
    }

    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .insert({
        ticket_id: finalTicketId,
        technician_id: finalTechnician,
        device_info: finalDeviceInfo,
        damage_assessment: finalDamageAssessment,
        repair_estimate: finalRepairEstimate,
        parts_needed: finalPartsNeeded,
        status: status === 'completed' ? 'awaiting_approval' : 'in_progress',
        // Store comprehensive data in report_data JSONB field
        report_data: {
          timeSpent,
          aiAnalysis,
          dynamicCheckboxes,
          deviceType,
          make,
          model,
          claim,
          lastUsed,
          deviceRepairable,
          repairExplanation,
          photosCount: photos?.length || 0,
          technician: finalTechnician,
          timestamp: new Date().toISOString()
        }
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
