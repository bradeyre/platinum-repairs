import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const technicianId = searchParams.get('technicianId')
    const showAll = searchParams.get('showAll') === 'true'

    console.log('📊 Fetching time tracking data:', { date, technicianId, showAll })

    // Build query for time tracking entries
    let timeEntriesQuery = supabaseAdmin
      .from('time_tracking')
      .select('*')
      .order('start_time', { ascending: false })

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      timeEntriesQuery = timeEntriesQuery
        .gte('start_time', startDate.toISOString())
        .lt('start_time', endDate.toISOString())
    }

    if (technicianId) {
      timeEntriesQuery = timeEntriesQuery.eq('technician_id', technicianId)
    }

    const { data: timeEntries, error: timeEntriesError } = await timeEntriesQuery

    if (timeEntriesError) {
      console.error('❌ Error fetching time entries:', timeEntriesError)
      return NextResponse.json(
        { error: 'Failed to fetch time entries', details: timeEntriesError.message },
        { status: 500 }
      )
    }

    // Calculate productivity metrics for each technician
    const productivityMetrics = await calculateProductivityMetrics(timeEntries || [], date)

    console.log(`✅ Fetched ${timeEntries?.length || 0} time entries and ${productivityMetrics.length} productivity metrics`)

    return NextResponse.json({
      success: true,
      entries: timeEntries || [],
      metrics: productivityMetrics,
      count: timeEntries?.length || 0
    })

  } catch (error) {
    console.error('❌ Error fetching time tracking data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const timeEntryData = await request.json()
    
    const {
      ticketId,
      technicianId,
      technicianName,
      workType = 'repair',
      description = '',
      startTime,
      endTime,
      duration,
      status = 'active'
    } = timeEntryData

    console.log('⏱️ Creating time tracking entry:', {
      ticketId,
      technicianId,
      workType,
      status
    })

    if (!ticketId || !technicianId || !technicianName) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, technicianId, technicianName' },
        { status: 400 }
      )
    }

    const { data: timeEntry, error } = await supabaseAdmin
      .from('time_tracking')
      .insert({
        ticket_id: ticketId,
        technician_id: technicianId,
        technician_name: technicianName,
        work_type: workType,
        description: description,
        start_time: startTime || new Date().toISOString(),
        end_time: endTime,
        duration: duration,
        status: status
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating time entry:', error)
      return NextResponse.json(
        { error: 'Failed to create time entry', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Time tracking entry created:', timeEntry.id)

    return NextResponse.json({
      success: true,
      timeEntry: timeEntry,
      message: 'Time tracking entry created successfully'
    })

  } catch (error) {
    console.error('❌ Error creating time tracking entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updateData = await request.json()
    
    const {
      id,
      endTime,
      duration,
      status = 'completed',
      productivityScore
    } = updateData

    console.log('⏱️ Updating time tracking entry:', { id, status })

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    const updateFields: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (endTime) updateFields.end_time = endTime
    if (duration) updateFields.duration = duration
    if (productivityScore) updateFields.productivity_score = productivityScore

    const { data: timeEntry, error } = await supabaseAdmin
      .from('time_tracking')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating time entry:', error)
      return NextResponse.json(
        { error: 'Failed to update time entry', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Time tracking entry updated:', timeEntry.id)

    return NextResponse.json({
      success: true,
      timeEntry: timeEntry,
      message: 'Time tracking entry updated successfully'
    })
    
  } catch (error) {
    console.error('❌ Error updating time tracking entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate productivity metrics
async function calculateProductivityMetrics(timeEntries: any[], date?: string | null) {
  const technicianMap = new Map()

  // Process time entries to calculate metrics per technician
  timeEntries.forEach(entry => {
    const techId = entry.technician_id
    const techName = entry.technician_name

    if (!technicianMap.has(techId)) {
      technicianMap.set(techId, {
        technicianId: techId,
        technicianName: techName,
        totalActiveTime: 0,
        totalPausedTime: 0,
        totalCompletedTime: 0,
        completedSessions: 0,
        ticketsCompleted: 0,
        workTypes: new Set()
      })
    }

    const tech = technicianMap.get(techId)
    tech.workTypes.add(entry.work_type)

    if (entry.status === 'completed' && entry.duration) {
      tech.totalCompletedTime += entry.duration
      tech.completedSessions += 1
      tech.ticketsCompleted += 1
    } else if (entry.status === 'active') {
      // Calculate active time for ongoing sessions
      const startTime = new Date(entry.start_time).getTime()
      const currentTime = new Date().getTime()
      const activeTime = Math.floor((currentTime - startTime) / 1000)
      tech.totalActiveTime += activeTime
    } else if (entry.status === 'paused') {
      // Calculate paused time
      const startTime = new Date(entry.start_time).getTime()
      const currentTime = new Date().getTime()
      const pausedTime = Math.floor((currentTime - startTime) / 1000)
      tech.totalPausedTime += pausedTime
    }
  })

  // Convert to productivity metrics array
  const productivityMetrics = Array.from(technicianMap.values()).map(tech => {
    const totalWorkTime = tech.totalActiveTime + tech.totalCompletedTime
    const averageSessionLength = tech.completedSessions > 0 ? tech.totalCompletedTime / tech.completedSessions : 0
    const averageTimePerTicket = tech.ticketsCompleted > 0 ? tech.totalCompletedTime / tech.ticketsCompleted : 0

    // Calculate productivity score (0-100)
    let productivityScore = 0
    if (totalWorkTime > 0) {
      // Base score on completed work vs total time
      const completionRatio = tech.totalCompletedTime / totalWorkTime
      const efficiencyBonus = tech.ticketsCompleted > 0 ? Math.min(tech.ticketsCompleted * 5, 30) : 0
      productivityScore = Math.min(Math.round(completionRatio * 70 + efficiencyBonus), 100)
    }

    // Determine efficiency rating
    let efficiencyRating = 'Needs Improvement'
    if (productivityScore >= 90) efficiencyRating = 'Excellent'
    else if (productivityScore >= 75) efficiencyRating = 'Good'
    else if (productivityScore >= 60) efficiencyRating = 'Average'

    return {
      technicianId: tech.technicianId,
      technicianName: tech.technicianName,
      totalActiveTime: tech.totalActiveTime,
      totalPausedTime: tech.totalPausedTime,
      totalCompletedTime: tech.totalCompletedTime,
      averageSessionLength: Math.round(averageSessionLength),
      productivityScore: productivityScore,
      efficiencyRating: efficiencyRating,
      todayHours: Math.round((tech.totalActiveTime + tech.totalCompletedTime) / 3600 * 10) / 10,
      weeklyHours: Math.round((tech.totalActiveTime + tech.totalCompletedTime) / 3600 * 10) / 10, // Simplified for demo
      monthlyHours: Math.round((tech.totalActiveTime + tech.totalCompletedTime) / 3600 * 10) / 10, // Simplified for demo
      ticketsCompleted: tech.ticketsCompleted,
      averageTimePerTicket: Math.round(averageTimePerTicket),
      isOnline: tech.totalActiveTime > 0 // Simplified online detection
    }
  })

  return productivityMetrics.sort((a, b) => b.productivityScore - a.productivityScore)
}