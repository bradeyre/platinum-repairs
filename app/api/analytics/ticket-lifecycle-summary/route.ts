import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check if we have any ticket lifecycle data
    const { count: totalTickets } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('*', { count: 'exact', head: true })
    
    if (totalTickets === 0) {
      return NextResponse.json({
        success: false,
        error: 'No ticket lifecycle data found',
        message: 'Please sync RepairShopr data first using the sync endpoint'
      }, { status: 404 })
    }
    
    // Get comprehensive analytics data from the correct view
    const { data: ticketData, error: ticketError } = await supabaseAdmin
      .from('ticket_lifecycle_summary')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (ticketError) {
      console.error('Error fetching ticket analytics:', ticketError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ticket analytics data',
        details: ticketError.message
      }, { status: 500 })
    }
    
    // Get analytics summary data
    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from('analytics_summary')
      .select('*')
    
    if (summaryError) {
      console.error('Error fetching analytics summary:', summaryError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch analytics summary data',
        details: summaryError.message
      }, { status: 500 })
    }
    
    // Process the data into comprehensive analytics
    const analyticsData = processComprehensiveAnalytics(ticketData || [], summaryData || [])
    
    return NextResponse.json({
      success: true,
      data: analyticsData,
      metadata: {
        totalTickets: totalTickets,
        lastUpdated: new Date().toISOString(),
        dataSource: 'ticket_lifecycle'
      }
    })
    
  } catch (error) {
    console.error('Error generating comprehensive analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function processComprehensiveAnalytics(ticketData: any[], summaryData: any[]): any {
  // Get summary data from the analytics_summary view
  const summary = summaryData[0] || {}
  
  // Calculate summary statistics
  const totalTickets = summary.total_tickets || ticketData.length
  const completedTickets = summary.completed_tickets || 0
  const activeTickets = totalTickets - completedTickets
  const reworkTickets = ticketData.filter(t => t.description?.toLowerCase().includes('rework')).length
  
  const avgCompletionTime = summary.avg_completion_time || 0
  
  const avgActiveWorkTime = summary.avg_completion_time || 0
  
  const avgWaitingTime = summary.avg_wait_time || 0
  
  const totalWorkHours = ticketData.reduce((sum, t) => sum + (t.total_business_hours || 0), 0)
  const overallReworkRate = totalTickets > 0 ? (reworkTickets / totalTickets) * 100 : 0
  const totalTechnicians = summary.active_technicians || new Set(ticketData.map(t => t.assigned_to).filter(Boolean)).size
  
  // Process device analytics
  const deviceAnalytics: Record<string, any> = {}
  ticketData.forEach(ticket => {
    const deviceType = extractDeviceType(ticket.device_info || ticket.description || '')
    if (!deviceAnalytics[deviceType]) {
      deviceAnalytics[deviceType] = {
        totalRepairs: 0,
        avgCompletionTime: 0,
        reworkRate: 0,
        topTechnicians: []
      }
    }
    deviceAnalytics[deviceType].totalRepairs++
  })
  
  // Calculate device analytics
  Object.keys(deviceAnalytics).forEach(device => {
    const deviceTickets = ticketData.filter(t => 
      extractDeviceType(t.device_info || t.description || '') === device
    )
    deviceAnalytics[device].avgCompletionTime = deviceTickets.length > 0 ?
      deviceTickets.reduce((sum, t) => sum + (t.total_hours || 0), 0) / deviceTickets.length : 0
    deviceAnalytics[device].reworkRate = deviceTickets.length > 0 ?
      (deviceTickets.filter(t => t.is_rework).length / deviceTickets.length) * 100 : 0
    
    // Get top technicians for this device
    const techCounts: Record<string, number> = {}
    deviceTickets.forEach(t => {
      if (t.assigned_technician_name) {
        techCounts[t.assigned_technician_name] = (techCounts[t.assigned_technician_name] || 0) + 1
      }
    })
    deviceAnalytics[device].topTechnicians = Object.entries(techCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([tech]) => tech)
  })
  
  // Process repair type analytics
  const repairTypeAnalytics: Record<string, any> = {}
  ticketData.forEach(ticket => {
    const repairType = ticket.repair_type || 'General Repair'
    if (!repairTypeAnalytics[repairType]) {
      repairTypeAnalytics[repairType] = {
        totalRepairs: 0,
        avgCompletionTime: 0,
        reworkRate: 0,
        difficulty: 'medium' as const
      }
    }
    repairTypeAnalytics[repairType].totalRepairs++
  })
  
  // Calculate repair type analytics
  Object.keys(repairTypeAnalytics).forEach(repairType => {
    const repairTickets = ticketData.filter(t => (t.repair_type || 'General Repair') === repairType)
    repairTypeAnalytics[repairType].avgCompletionTime = repairTickets.length > 0 ?
      repairTickets.reduce((sum, t) => sum + (t.total_hours || 0), 0) / repairTickets.length : 0
    repairTypeAnalytics[repairType].reworkRate = repairTickets.length > 0 ?
      (repairTickets.filter(t => t.is_rework).length / repairTickets.length) * 100 : 0
    
    // Determine difficulty based on average completion time
    const avgTime = repairTypeAnalytics[repairType].avgCompletionTime
    if (avgTime > 4) {
      repairTypeAnalytics[repairType].difficulty = 'hard'
    } else if (avgTime > 2) {
      repairTypeAnalytics[repairType].difficulty = 'medium'
    } else {
      repairTypeAnalytics[repairType].difficulty = 'easy'
    }
  })
  
  // Process time analytics
  const dailyPerformance: Record<string, any> = {}
  const hourlyPatterns: Record<string, number> = {}
  
  ticketData.forEach(ticket => {
    const date = new Date(ticket.created_at).toISOString().split('T')[0]
    const hour = new Date(ticket.created_at).getHours().toString()
    
    if (!dailyPerformance[date]) {
      dailyPerformance[date] = {
        ticketsCompleted: 0,
        avgCompletionTime: 0,
        reworkRate: 0
      }
    }
    dailyPerformance[date].ticketsCompleted++
    
    hourlyPatterns[hour] = (hourlyPatterns[hour] || 0) + 1
  })
  
  // Calculate daily performance metrics
  Object.keys(dailyPerformance).forEach(date => {
    const dayTickets = ticketData.filter(t => 
      new Date(t.created_at).toISOString().split('T')[0] === date
    )
    dailyPerformance[date].avgCompletionTime = dayTickets.length > 0 ?
      dayTickets.reduce((sum, t) => sum + (t.total_hours || 0), 0) / dayTickets.length : 0
    dailyPerformance[date].reworkRate = dayTickets.length > 0 ?
      (dayTickets.filter(t => t.is_rework).length / dayTickets.length) * 100 : 0
  })
  
  // Find peak hours
  const sortedHours = Object.entries(hourlyPatterns)
    .sort(([,a], [,b]) => (b as number) - (a as number))
  const peakHours = sortedHours.slice(0, 3).map(([hour]) => hour)
  
  // Process rework analytics
  const reworkTicketsData = ticketData.filter(t => t.is_rework)
  const reworkByTechnician: Record<string, number> = {}
  const reworkByDevice: Record<string, number> = {}
  
  reworkTicketsData.forEach(ticket => {
    if (ticket.assigned_technician_name) {
      reworkByTechnician[ticket.assigned_technician_name] = 
        (reworkByTechnician[ticket.assigned_technician_name] || 0) + 1
    }
    
    const deviceType = extractDeviceType(ticket.device_info || ticket.description || '')
    reworkByDevice[deviceType] = (reworkByDevice[deviceType] || 0) + 1
  })
  
  const avgReworkTime = reworkTicketsData.length > 0 ?
    reworkTicketsData.reduce((sum, t) => sum + (t.total_hours || 0), 0) / reworkTicketsData.length : 0
  
  const topReworkReasons = [
    'Quality issues detected',
    'Incomplete repair',
    'Customer reported problems',
    'Testing failures',
    'Parts compatibility issues'
  ]
  
  return {
    summary: {
      totalTickets,
      completedTickets,
      activeTickets,
      reworkTickets,
      avgCompletionTime,
      avgActiveWorkTime,
      avgWaitingTime,
      totalWorkHours,
      overallReworkRate,
      totalTechnicians
    },
    technicianPerformance: [], // Will be populated when we have technician data
    deviceAnalytics,
    repairTypeAnalytics,
    timeAnalytics: {
      dailyPerformance,
      hourlyPatterns,
      peakHours
    },
    reworkAnalytics: {
      totalReworks: reworkTicketsData.length,
      reworkRate: overallReworkRate,
      topReworkReasons,
      reworkByTechnician,
      reworkByDevice,
      avgReworkTime
    }
  }
}

function extractDeviceType(deviceInfo: string): string {
  if (!deviceInfo) return 'Unknown'
  
  const lower = deviceInfo.toLowerCase()
  
  if (lower.includes('iphone') || lower.includes('samsung galaxy') || lower.includes('huawei') || lower.includes('oneplus')) {
    return 'Smartphone'
  } else if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('tab')) {
    return 'Tablet'
  } else if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) {
    return 'Laptop'
  } else if (lower.includes('desktop') || lower.includes('pc')) {
    return 'Desktop'
  } else if (lower.includes('watch') || lower.includes('band')) {
    return 'Wearable'
  } else {
    return 'Other'
  }
}
