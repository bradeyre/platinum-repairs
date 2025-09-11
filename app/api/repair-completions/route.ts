import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    // 3. Update ticket status in RepairShopr (if needed)
    // This would integrate with your existing RepairShopr update logic
    try {
      // Extract ticket number and determine ticket type
      const ticketNum = ticketNumber.replace('#', '')
      const ticketType = ticketId.includes('PR') ? 'PR' : 'DD'
      
      console.log(`🔄 Updating RepairShopr ticket ${ticketNum} (${ticketType}) to "Repair Completed"`)
      
      // You can integrate with your existing updateRepairShoprTicketStatus function here
      // const updateSuccess = await updateRepairShoprTicketStatus(ticketNum, ticketType, 'Repair Completed')
      
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
