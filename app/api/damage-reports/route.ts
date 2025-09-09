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
      ticket, // New format - could be ticket object or ticketId string
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
    // Handle case where ticket is an object with ticketId property
    const finalTicketId = (typeof ticket === 'object' && ticket?.ticketId) ? ticket.ticketId : (ticket || ticketId)
    const finalTechnician = technician || technicianId
    const finalDeviceInfo = deviceInfo || device_info || `${make} ${model}` || 'Device assessment completed'
    const finalDamageAssessment = damageAssessment || additionalNotes || 'Damage assessment completed'
    const finalPartsNeeded = suggestedParts || partsNeeded || []
    const finalRepairEstimate = repairEstimate || 0

    console.log('🔍 Damage report data received:', {
      finalTicketId,
      finalTechnician,
      finalDeviceInfo,
      status,
      hasAiAnalysis: !!aiAnalysis,
      hasDynamicCheckboxes: !!dynamicCheckboxes,
      photosCount: photos?.length || 0
    })

    if (!finalTicketId || !finalTechnician) {
      return NextResponse.json(
        { error: 'Missing required fields: ticket, technician' },
        { status: 400 }
      )
    }

    // Generate a unique DR number
    const drNumber = `DR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .insert({
        dr_number: drNumber,
        claim_number: claim || '',
        device_brand: make || 'Unknown',
        device_model: model || 'Unknown',
        device_type: deviceType || 'Unknown',
        imei_serial: '', // Will be filled from form data
        client_reported_issues: dynamicCheckboxes?.filter((cb: any) => cb.checked).map((cb: any) => cb.label) || [],
        tech_findings: dynamicCheckboxes?.filter((cb: any) => cb.checked).map((cb: any) => cb.notes).filter((note: any) => note) || [],
        damage_photos: photos?.map((photo: any) => photo.name) || [],
        final_parts_selected: suggestedParts || [],
        total_parts_cost: 0, // Will be calculated from parts pricing
        status: status === 'completed' ? 'awaiting_approval' : 'in_assessment',
        notes: additionalNotes || '',
        ai_checklist: dynamicCheckboxes?.map((cb: any) => cb.label) || [],
        ai_risk_assessment: aiAnalysis?.riskFactors || '',
        assigned_tech_id: null, // Will be set based on technician
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Store comprehensive data in report_data JSONB field
        report_data: {
          ticketId: finalTicketId,
          technician: finalTechnician,
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
