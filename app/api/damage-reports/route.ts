import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Function to update RepairShopr ticket status
async function updateRepairShoprTicketStatus(ticketNumber: string, ticketType: 'PR' | 'DD', newStatus: string) {
  try {
    const token = ticketType === 'PR' 
      ? process.env.REPAIRSHOPR_TOKEN 
      : process.env.REPAIRSHOPR_TOKEN_DD
    
    const baseUrl = ticketType === 'PR'
      ? 'https://platinumrepairs.repairshopr.com/api/v1'
      : 'https://devicedoctorsa.repairshopr.com/api/v1'
    
    if (!token) {
      console.error('RepairShopr token not found for ticket type:', ticketType)
      return false
    }

    // First, find the ticket by number to get its ID
    const searchUrl = `${baseUrl}/tickets?number=${ticketNumber}&api_key=${token}`
    console.log(`🔍 Searching for ticket ${ticketNumber} in ${ticketType} instance`)
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!searchResponse.ok) {
      console.error(`❌ Failed to search for ticket ${ticketNumber}: ${searchResponse.status}`)
      return false
    }

    const searchData = await searchResponse.json()
    const tickets = searchData.tickets || []
    
    if (tickets.length === 0) {
      console.error(`❌ Ticket ${ticketNumber} not found in ${ticketType} instance`)
      return false
    }

    const ticket = tickets[0]
    console.log(`✅ Found ticket ${ticketNumber} with ID ${ticket.id}`)

    // Update the ticket status
    const updateUrl = `${baseUrl}/tickets/${ticket.id}?api_key=${token}`
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus
      })
    })

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error(`❌ Failed to update ticket ${ticketNumber}: ${updateResponse.status} - ${errorText}`)
      return false
    }

    console.log(`✅ Successfully updated ticket ${ticketNumber} status to ${newStatus}`)
    return true
  } catch (error) {
    console.error(`❌ Error updating RepairShopr ticket ${ticketNumber}:`, error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching damage reports from Supabase...')
    
    const { data: reports, error } = await supabaseAdmin
      .from('damage_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase error fetching damage reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch damage reports', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully fetched ${reports?.length || 0} damage reports`)
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('❌ Error fetching damage reports:', error)
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
      partsUsed, // From technician dashboard
      status = 'completed', // New format defaults to completed
      timeSpent,
      aiAnalysis,
      dynamicCheckboxes,
      additionalNotes,
      deviceType,
      make,
      model,
      claim,
      clientName,
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
        client_name: clientName || '',
        device_brand: make || 'Unknown',
        device_model: model || 'Unknown',
        device_type: deviceType || 'Unknown',
        imei_serial: '', // Will be filled from form data
        client_reported_issues: dynamicCheckboxes?.filter((cb: any) => cb.checked).map((cb: any) => cb.label) || [],
        tech_findings: dynamicCheckboxes?.filter((cb: any) => cb.checked).map((cb: any) => cb.notes).filter((note: any) => note) || [],
        damage_photos: photos || [],
        final_parts_selected: suggestedParts || partsUsed || [],
        total_parts_cost: 0, // Will be calculated from parts pricing
        final_total_cost: 0, // Final repair cost for Claim Manager
        excess_amount: 0, // Insurance excess amount
        replacement_value: 0, // Device replacement value
        status: status === 'completed' ? 'awaiting_approval' : 'in_assessment',
        notes: additionalNotes || '',
        ai_checklist: dynamicCheckboxes?.map((cb: any) => cb.label) || [],
        ai_risk_assessment: aiAnalysis?.riskFactors || '',
        tech_ber_suggestion: deviceRepairable === false, // BER suggestion from technician
        manager_ber_decision: null, // Will be set by Claim Manager
        ber_reason: deviceRepairable === false ? repairExplanation : null,
        priority: 3, // Default priority (1=high, 5=low)
        is_overdue: false,
        is_warning: false,
        assigned_tech_id: null, // Will be set based on technician
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

    // If damage report is completed, update RepairShopr ticket status
    if (status === 'completed' && finalTicketId) {
      console.log(`🔄 Damage report completed, updating RepairShopr ticket status for: ${finalTicketId}`)
      console.log(`🔄 Status: ${status}, FinalTicketId: ${finalTicketId}`)
      
      // Extract ticket number and determine ticket type
      const ticketNumber = finalTicketId.replace('#', '')
      const ticketType = finalTicketId.includes('PR') ? 'PR' : 'DD'
      
      console.log(`🔄 Extracted ticketNumber: ${ticketNumber}, ticketType: ${ticketType}`)
      
      // Update RepairShopr ticket status to "Damage Report Completed"
      try {
        const updateSuccess = await updateRepairShoprTicketStatus(ticketNumber, ticketType, 'Damage Report Completed')
        
        if (updateSuccess) {
          console.log(`✅ Successfully updated RepairShopr ticket ${ticketNumber} to "Damage Report Completed" status`)
        } else {
          console.log(`⚠️ Failed to update RepairShopr ticket ${ticketNumber} status, but damage report was saved`)
        }
      } catch (updateError) {
        console.error(`❌ Error updating RepairShopr ticket ${ticketNumber}:`, updateError)
      }
    } else {
      console.log(`⚠️ Not updating RepairShopr status - status: ${status}, finalTicketId: ${finalTicketId}`)
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
