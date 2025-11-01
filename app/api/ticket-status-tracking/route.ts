import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Track when tickets change status and save wait times for analytics
export async function POST(request: NextRequest) {
  try {
    const { ticketId, oldStatus, newStatus, technicianId, timestamp } = await request.json()
    
    // Only track when tickets move to "In Progress" or "Troubleshooting" (tech starts working)
    if ((newStatus === 'In Progress' || newStatus === 'Troubleshooting') && (oldStatus !== 'In Progress' && oldStatus !== 'Troubleshooting')) {
      // Calculate the wait time from status change to now
      const statusChangeTime = new Date(timestamp)
      const now = new Date()
      const waitTimeHours = calculateBusinessHours(statusChangeTime, now)
      
      // Save to performance stats
      const { error } = await supabase
        .from('ticket_wait_times')
        .insert({
          ticket_id: ticketId,
          old_status: oldStatus,
          new_status: newStatus,
          technician_id: technicianId,
          wait_time_hours: waitTimeHours,
          status_changed_at: statusChangeTime,
          completed_at: now
        })
      
      if (error) {
        console.error('Error saving wait time:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      
      console.log(`✅ Saved wait time for ticket ${ticketId}: ${waitTimeHours} business hours`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking ticket status:', error)
    return NextResponse.json({ success: false, error: 'Failed to track status' }, { status: 500 })
  }
}

// Get performance stats for technicians and department
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    const technicianId = searchParams.get('technicianId')
    
    let query = supabase
      .from('ticket_wait_times')
      .select('*')
      .order('completed_at', { ascending: false })
    
    // Filter by technician if specified
    if (technicianId) {
      query = query.eq('technician_id', technicianId)
    }
    
    // Filter by time period
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    
    query = query.gte('completed_at', startDate.toISOString())
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching wait times:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    // Calculate statistics
    const stats = calculateWaitTimeStats(data || [])
    
    return NextResponse.json({
      success: true,
      stats,
      waitTimes: data || []
    })
  } catch (error) {
    console.error('Error fetching performance stats:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}

// Calculate business hours between two dates (8 AM - 6 PM, Monday-Friday)
function calculateBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let businessHours = 0
  
  // Business hours: 8 AM to 6 PM, Monday to Friday
  const businessStart = 8 // 8 AM
  const businessEnd = 18 // 6 PM
  
  while (start < end) {
    const dayOfWeek = start.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Only count Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dayStart = new Date(start)
      dayStart.setHours(businessStart, 0, 0, 0)
      
      const dayEnd = new Date(start)
      dayEnd.setHours(businessEnd, 0, 0, 0)
      
      // Calculate overlap with business hours for this day
      const effectiveStart = start < dayStart ? dayStart : start
      const effectiveEnd = end < dayEnd ? end : dayEnd
      
      if (effectiveStart < effectiveEnd) {
        businessHours += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60)
      }
    }
    
    // Move to next day
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
  }
  
  return businessHours
}

// Calculate wait time statistics
function calculateWaitTimeStats(waitTimes: any[]) {
  if (waitTimes.length === 0) {
    return {
      totalTickets: 0,
      averageWaitTime: 0,
      medianWaitTime: 0,
      maxWaitTime: 0,
      minWaitTime: 0,
      technicianStats: []
    }
  }
  
  const waitTimesArray = waitTimes.map(wt => wt.wait_time_hours)
  const sortedWaitTimes = waitTimesArray.sort((a, b) => a - b)
  
  // Calculate basic stats
  const totalTickets = waitTimes.length
  const averageWaitTime = waitTimesArray.reduce((sum, time) => sum + time, 0) / totalTickets
  const medianWaitTime = sortedWaitTimes[Math.floor(totalTickets / 2)]
  const maxWaitTime = Math.max(...waitTimesArray)
  const minWaitTime = Math.min(...waitTimesArray)
  
  // Calculate technician stats
  const technicianMap = new Map()
  waitTimes.forEach(wt => {
    const techId = wt.technician_id
    if (!technicianMap.has(techId)) {
      technicianMap.set(techId, [])
    }
    technicianMap.get(techId).push(wt.wait_time_hours)
  })
  
  const technicianStats = Array.from(technicianMap.entries()).map(([techId, times]) => ({
    technicianId: techId,
    totalTickets: times.length,
    averageWaitTime: times.reduce((sum: number, time: number) => sum + time, 0) / times.length,
    maxWaitTime: Math.max(...times),
    minWaitTime: Math.min(...times)
  }))
  
  return {
    totalTickets,
    averageWaitTime: Math.round(averageWaitTime * 100) / 100,
    medianWaitTime: Math.round(medianWaitTime * 100) / 100,
    maxWaitTime: Math.round(maxWaitTime * 100) / 100,
    minWaitTime: Math.round(minWaitTime * 100) / 100,
    technicianStats
  }
}
