import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Function to calculate business hours between two timestamps
function calculateBusinessMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  let totalMinutes = 0
  const current = new Date(start)
  
  while (current < end) {
    const dayOfWeek = current.getDay()
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1)
      current.setHours(8, 0, 0, 0) // Start of next business day
      continue
    }
    
    // Business hours: 8 AM to 6 PM (10 hours = 600 minutes)
    const dayStart = new Date(current)
    dayStart.setHours(8, 0, 0, 0)
    
    const dayEnd = new Date(current)
    dayEnd.setHours(18, 0, 0, 0)
    
    // If the current time is before business hours, start from 8 AM
    if (current < dayStart) {
      current.setHours(8, 0, 0, 0)
    }
    
    // If the current time is after business hours, move to next day
    if (current >= dayEnd) {
      current.setDate(current.getDate() + 1)
      current.setHours(8, 0, 0, 0)
      continue
    }
    
    // Calculate minutes for this day
    const workStart = current > dayStart ? current : dayStart
    const workEnd = end < dayEnd ? end : dayEnd
    
    if (workStart < workEnd) {
      totalMinutes += Math.floor((workEnd.getTime() - workStart.getTime()) / (1000 * 60))
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1)
    current.setHours(8, 0, 0, 0)
  }
  
  return totalMinutes
}

// Function to extract timing from admin notes
function extractTimingFromAdminNotes(ticket: any): { startTime: Date | null, endTime: Date | null } {
  if (!ticket.comments || !Array.isArray(ticket.comments)) {
    return { startTime: null, endTime: null }
  }
  
  // Look for admin notes with timing information
  const adminNotes = ticket.comments.filter((comment: any) => 
    comment.user?.role === 'admin' || 
    comment.user?.role === 'manager' ||
    comment.user?.username?.toLowerCase().includes('admin') ||
    comment.user?.username?.toLowerCase().includes('manager')
  )
  
  // Look for start and end time patterns
  const startPatterns = [
    /started at (\d{1,2}:\d{2})/i,
    /work began at (\d{1,2}:\d{2})/i,
    /repair started at (\d{1,2}:\d{2})/i,
    /damage report started at (\d{1,2}:\d{2})/i,
    /began at (\d{1,2}:\d{2})/i
  ]
  
  const endPatterns = [
    /completed at (\d{1,2}:\d{2})/i,
    /finished at (\d{1,2}:\d{2})/i,
    /work completed at (\d{1,2}:\d{2})/i,
    /repair completed at (\d{1,2}:\d{2})/i,
    /ended at (\d{1,2}:\d{2})/i
  ]
  
  let startTime: Date | null = null
  let endTime: Date | null = null
  
  for (const note of adminNotes) {
    const noteText = note.body || note.comment || ''
    const noteDate = new Date(note.created_at)
    
    // Check for start time
    for (const pattern of startPatterns) {
      const match = noteText.match(pattern)
      if (match && !startTime) {
        const timeStr = match[1]
        const [hours, minutes] = timeStr.split(':').map(Number)
        startTime = new Date(noteDate)
        startTime.setHours(hours, minutes, 0, 0)
        break
      }
    }
    
    // Check for end time
    for (const pattern of endPatterns) {
      const match = noteText.match(pattern)
      if (match && !endTime) {
        const timeStr = match[1]
        const [hours, minutes] = timeStr.split(':').map(Number)
        endTime = new Date(noteDate)
        endTime.setHours(hours, minutes, 0, 0)
        break
      }
    }
  }
  
  return { startTime, endTime }
}

// Function to get technician work time from RepairShopr tickets
async function getTechnicianWorkTimeFromTickets(technicianName: string, date: string) {
  try {
    // Get tickets for both PR and DD instances with comments
    const [prResponse, ddResponse] = await Promise.all([
      fetch(`https://platinumrepairs.repairshopr.com/api/v1/tickets?api_key=${process.env.REPAIRSHOPR_TOKEN}&assigned_to=${encodeURIComponent(technicianName)}&created_at=${date}&expand=comments`),
      fetch(`https://devicedoctorsa.repairshopr.com/api/v1/tickets?api_key=${process.env.REPAIRSHOPR_TOKEN_DD}&assigned_to=${encodeURIComponent(technicianName)}&created_at=${date}&expand=comments`)
    ])
    
    const [prData, ddData] = await Promise.all([
      prResponse.json(),
      ddResponse.json()
    ])
    
    const allTickets = [...(prData.tickets || []), ...(ddData.tickets || [])]
    
    let totalActiveMinutes = 0
    
    // Process each ticket to calculate work time
    for (const ticket of allTickets) {
      if (ticket.status && ticket.created_at) {
        // First, try to get timing from admin notes
        const adminTiming = extractTimingFromAdminNotes(ticket)
        
        if (adminTiming.startTime && adminTiming.endTime) {
          // Use admin note timing
          const workMinutes = calculateBusinessMinutes(adminTiming.startTime.toISOString(), adminTiming.endTime.toISOString())
          totalActiveMinutes += workMinutes
          console.log(`📝 Ticket ${ticket.number}: ${workMinutes} minutes from admin notes`)
        } else if (adminTiming.startTime) {
          // Only start time from admin notes, estimate end time
          const endTime = ticket.updated_at || new Date().toISOString()
          const workMinutes = calculateBusinessMinutes(adminTiming.startTime.toISOString(), endTime)
          totalActiveMinutes += Math.min(workMinutes, 480) // Cap at 8 hours
          console.log(`📝 Ticket ${ticket.number}: ${workMinutes} minutes from admin start time`)
        } else {
          // Fallback to status changes
          const statusChanges = ticket.status_changes || []
          
          if (statusChanges.length > 0) {
            // Get the first status change (when work started)
            const firstChange = statusChanges[0]
            const workStart = firstChange.created_at || ticket.created_at
            
            // Get the last status change (when work completed)
            const lastChange = statusChanges[statusChanges.length - 1]
            const workEnd = lastChange.created_at || ticket.updated_at || ticket.created_at
            
            // Calculate business minutes between start and end
            const workMinutes = calculateBusinessMinutes(workStart, workEnd)
            totalActiveMinutes += workMinutes
            
            console.log(`📊 Ticket ${ticket.number}: ${workMinutes} minutes from status changes`)
          } else {
            // If no status changes, estimate based on ticket age
            const ticketAge = calculateBusinessMinutes(ticket.created_at, ticket.updated_at || new Date().toISOString())
            totalActiveMinutes += Math.min(ticketAge, 480) // Cap at 8 hours per ticket
            console.log(`📊 Ticket ${ticket.number}: ${ticketAge} minutes estimated`)
          }
        }
      }
    }
    
    return totalActiveMinutes
  } catch (error) {
    console.error(`❌ Error getting work time for ${technicianName}:`, error)
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const technicianId = searchParams.get('technicianId')
    
    console.log('📊 Fetching active minutes for:', { date, technicianId })
    
    // Get time tracking data from our system
    let timeTrackingQuery = supabaseAdmin
      .from('time_tracking')
      .select('*')
      .eq('status', 'completed')
      .gte('start_time', `${date}T00:00:00.000Z`)
      .lt('start_time', `${date}T23:59:59.999Z`)
    
    if (technicianId) {
      timeTrackingQuery = timeTrackingQuery.eq('technician_id', technicianId)
    }
    
    const { data: timeEntries, error: timeEntriesError } = await timeTrackingQuery
    
    if (timeEntriesError) {
      console.error('❌ Error fetching time entries:', timeEntriesError)
      return NextResponse.json(
        { error: 'Failed to fetch time entries', details: timeEntriesError.message },
        { status: 500 }
      )
    }
    
    // Calculate active minutes from our system
    const systemActiveMinutes = (timeEntries || []).reduce((total, entry) => {
      return total + (entry.duration || 0)
    }, 0)
    
    // Get technician names for RepairShopr lookup
    const technicianNames = [...new Set((timeEntries || []).map(entry => entry.technician_name))]
    
    // Add Thasveer and Reece for RepairShopr tracking
    if (!technicianId || technicianId === 'thasveer' || technicianId === 'reece') {
      technicianNames.push('Thasveer', 'Reece')
    }
    
    // Get work time from RepairShopr for technicians who might not use our system
    let repairShoprActiveMinutes = 0
    for (const technicianName of technicianNames) {
      if (technicianName === 'Thasveer' || technicianName === 'Reece') {
        const workTime = await getTechnicianWorkTimeFromTickets(technicianName, date)
        repairShoprActiveMinutes += workTime
        console.log(`📊 ${technicianName} RepairShopr work time: ${workTime} minutes`)
      }
    }
    
    const totalActiveMinutes = systemActiveMinutes + repairShoprActiveMinutes
    const totalHours = Math.floor(totalActiveMinutes / 60)
    const remainingMinutes = totalActiveMinutes % 60
    const workDayHours = 8
    const workDayMinutes = workDayHours * 60
    const efficiency = workDayMinutes > 0 ? (totalActiveMinutes / workDayMinutes) * 100 : 0
    
    console.log(`✅ Total active minutes: ${totalActiveMinutes} (${totalHours}h ${remainingMinutes}m)`)
    console.log(`📈 Efficiency: ${efficiency.toFixed(1)}% of 8-hour work day`)
    
    return NextResponse.json({
      success: true,
      date,
      totalActiveMinutes,
      totalHours,
      remainingMinutes,
      efficiency: Math.round(efficiency * 10) / 10,
      workDayHours,
      workDayMinutes,
      breakdown: {
        systemActiveMinutes,
        repairShoprActiveMinutes,
        technicianBreakdown: technicianNames.map(name => ({
          name,
          activeMinutes: (timeEntries || [])
            .filter(entry => entry.technician_name === name)
            .reduce((total, entry) => total + (entry.duration || 0), 0)
        }))
      }
    })
    
  } catch (error) {
    console.error('❌ Error fetching active minutes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
