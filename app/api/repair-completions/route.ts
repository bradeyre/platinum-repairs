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

    console.log(`✅ Successfully updated ticket ${ticketNumber} status to "${newStatus}"`)
    return true

  } catch (error) {
    console.error(`❌ Error updating RepairShopr ticket ${ticketNumber}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const repairData = await request.json()
    
    const {
      ticketId,
      ticketNumber,
      technician,
      workCompleted,
      partsUsed,
      testingResults,
      finalStatus,
      notes,
      timeSpent,
      repairPhotos = [],
      photoCount = 0,
      repairChecklist = null,
      aiAnalysis = null
    } = repairData

    console.log('🔧 Repair completion data received:', {
      ticketId,
      ticketNumber,
      technician,
      workCompleted: workCompleted?.substring(0, 50) + '...',
      finalStatus,
      timeSpent,
      photoCount
    })

    if (!ticketId || !ticketNumber || !technician || !workCompleted || !testingResults) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, ticketNumber, technician, workCompleted, testingResults' },
        { status: 400 }
      )
    }

    // Calculate time spent in seconds for analytics
    const timeSpentSeconds = parseTimeToSeconds(timeSpent)

    // Start a transaction-like operation
    const repairCompletionId = crypto.randomUUID()

    // 1. Save repair photos if any
    const photoIds: string[] = []
    if (repairPhotos.length > 0) {
      console.log(`📸 Saving ${repairPhotos.length} repair photos...`)
      
      for (let i = 0; i < repairPhotos.length; i++) {
        const photoData = repairPhotos[i]
        const photoId = crypto.randomUUID()
        
        // Extract filename and type from base64 data
        const matches = photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        const mimeType = matches ? matches[1] : 'image/jpeg'
        const filename = `repair_${ticketNumber}_${Date.now()}_${i + 1}.${mimeType.split('/')[1]}`
        
        const { data: photoRecord, error: photoError } = await supabaseAdmin
          .from('repair_photos')
          .insert({
            id: photoId,
            ticket_id: ticketId,
            ticket_number: ticketNumber,
            technician_id: technician,
            technician_name: technician,
            photo_data: photoData,
            photo_filename: filename,
            photo_size: Math.round((photoData.length * 3) / 4), // Approximate size
            photo_type: mimeType,
            repair_completion_id: repairCompletionId
          })
          .select()
          .single()

        if (photoError) {
          console.error('❌ Error saving repair photo:', photoError)
          return NextResponse.json(
            { error: 'Failed to save repair photos', details: photoError.message },
            { status: 500 }
          )
        }

        photoIds.push(photoId)
        console.log(`✅ Saved repair photo ${i + 1}/${repairPhotos.length}`)
      }
    }

    // 2. Save repair completion record
    const { data: repairRecord, error: repairError } = await supabaseAdmin
      .from('repair_completions')
      .insert({
        id: repairCompletionId,
        ticket_id: ticketId,
        ticket_number: ticketNumber,
        technician_id: technician,
        technician_name: technician,
        work_completed: workCompleted,
        parts_used: partsUsed || '',
        testing_results: testingResults,
        final_status: finalStatus,
        notes: notes || '',
        time_spent: timeSpent,
        time_spent_seconds: timeSpentSeconds,
        repair_photos: photoIds,
        photo_count: photoCount,
        repair_checklist: repairChecklist ? JSON.stringify(repairChecklist) : null,
        ai_analysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null
      })
      .select()
      .single()

    if (repairError) {
      console.error('❌ Error saving repair completion:', repairError)
      return NextResponse.json(
        { error: 'Failed to save repair completion', details: repairError.message },
        { status: 500 }
      )
    }

    console.log('✅ Repair completion saved successfully:', repairRecord.id)

    // 3. Update ticket status in RepairShopr
    try {
      // Extract ticket number and determine ticket type
      const ticketNum = ticketNumber.replace('#', '')
      const ticketType = ticketId.includes('PR') ? 'PR' : 'DD'
      
      console.log(`🔄 Updating RepairShopr ticket ${ticketNum} (${ticketType}) to "Repair Completed"`)
      
      const updateSuccess = await updateRepairShoprTicketStatus(ticketNum, ticketType, 'Repair Completed')
      
      if (updateSuccess) {
        console.log(`✅ Successfully updated RepairShopr ticket ${ticketNum} to "Repair Completed" status`)
      } else {
        console.log(`⚠️ Failed to update RepairShopr ticket ${ticketNum} status, but repair completion was saved`)
      }
      
    } catch (updateError) {
      console.error('⚠️ Failed to update RepairShopr status:', updateError)
      // Don't fail the entire operation if RepairShopr update fails
    }

    return NextResponse.json({
      success: true,
      repairCompletion: repairRecord,
      photosSaved: photoIds.length,
      message: 'Repair completion saved successfully'
    })

  } catch (error) {
    console.error('❌ Error processing repair completion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    const technicianId = searchParams.get('technicianId')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabaseAdmin
      .from('repair_completions')
      .select(`
        *,
        repair_photos:repair_photos(id, photo_filename, photo_type, created_at)
      `)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (ticketId) {
      query = query.eq('ticket_id', ticketId)
    }

    if (technicianId) {
      query = query.eq('technician_id', technicianId)
    }

    const { data: repairs, error } = await query

    if (error) {
      console.error('❌ Error fetching repair completions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch repair completions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      repairs: repairs || [],
      count: repairs?.length || 0
    })

  } catch (error) {
    console.error('❌ Error fetching repair completions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to parse time string to seconds
function parseTimeToSeconds(timeString: string): number {
  if (!timeString) return 0
  
  const parts = timeString.split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    return hours * 3600 + minutes * 60 + seconds
  }
  
  return 0
}
