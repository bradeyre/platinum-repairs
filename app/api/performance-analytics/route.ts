import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Get comprehensive performance analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'
    const technicianId = searchParams.get('technicianId')
    
    // Calculate date range
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
    
    // Get wait time statistics
    let waitTimeQuery = supabase
      .from('ticket_wait_times')
      .select('*')
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: false })
    
    if (technicianId) {
      waitTimeQuery = waitTimeQuery.eq('technician_id', technicianId)
    }
    
    const { data: waitTimes, error: waitTimeError } = await waitTimeQuery
    
    if (waitTimeError) {
      console.error('Error fetching wait times:', waitTimeError)
      return NextResponse.json({ success: false, error: waitTimeError.message }, { status: 500 })
    }
    
    // Get technician performance data
    let performanceQuery = supabase
      .from('technician_performance')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false })
    
    if (technicianId) {
      performanceQuery = performanceQuery.eq('technician_id', technicianId)
    }
    
    const { data: performanceData, error: performanceError } = await performanceQuery
    
    if (performanceError) {
      console.error('Error fetching performance data:', performanceError)
      return NextResponse.json({ success: false, error: performanceError.message }, { status: 500 })
    }
    
    // Calculate analytics
    const analytics = calculateAnalytics(waitTimes || [], performanceData || [])
    
    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      analytics
    })
  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function calculateAnalytics(waitTimes: any[], performanceData: any[]) {
  // Overall department stats
  const totalTickets = waitTimes.length
  const averageWaitTime = totalTickets > 0 
    ? waitTimes.reduce((sum, wt) => sum + wt.wait_time_hours, 0) / totalTickets 
    : 0
  
  const waitTimeArray = waitTimes.map(wt => wt.wait_time_hours)
  const sortedWaitTimes = waitTimeArray.sort((a, b) => a - b)
  
  const medianWaitTime = totalTickets > 0 
    ? sortedWaitTimes[Math.floor(totalTickets / 2)]
    : 0
  
  const maxWaitTime = totalTickets > 0 ? Math.max(...waitTimeArray) : 0
  const minWaitTime = totalTickets > 0 ? Math.min(...waitTimeArray) : 0
  
  // Performance targets and grades
  const performanceTargets = {
    excellent: 2, // < 2 hours
    good: 4,      // 2-4 hours
    average: 8,   // 4-8 hours
    poor: 999     // > 8 hours
  }
  
  const performanceGrades = {
    excellent: waitTimes.filter(wt => wt.wait_time_hours < performanceTargets.excellent).length,
    good: waitTimes.filter(wt => wt.wait_time_hours >= performanceTargets.excellent && wt.wait_time_hours < performanceTargets.good).length,
    average: waitTimes.filter(wt => wt.wait_time_hours >= performanceTargets.good && wt.wait_time_hours < performanceTargets.average).length,
    poor: waitTimes.filter(wt => wt.wait_time_hours >= performanceTargets.average).length
  }
  
  // Technician performance
  const technicianMap = new Map()
  waitTimes.forEach(wt => {
    const techId = wt.technician_id
    if (!technicianMap.has(techId)) {
      technicianMap.set(techId, [])
    }
    technicianMap.get(techId).push(wt)
  })
  
  const technicianStats = Array.from(technicianMap.entries()).map(([techId, times]) => {
    const waitTimeHours = times.map((t: any) => t.wait_time_hours)
    const avgWaitTime = waitTimeHours.reduce((sum: number, time: number) => sum + time, 0) / waitTimeHours.length
    
    return {
      technicianId: techId,
      totalTickets: times.length,
      averageWaitTime: Math.round(avgWaitTime * 100) / 100,
      maxWaitTime: Math.max(...waitTimeHours),
      minWaitTime: Math.min(...waitTimeHours),
      efficiencyScore: calculateEfficiencyScore(avgWaitTime),
      performanceGrade: getPerformanceGrade(avgWaitTime)
    }
  }).sort((a, b) => a.averageWaitTime - b.averageWaitTime) // Sort by best performance first
  
  // Department efficiency score
  const departmentEfficiency = calculateEfficiencyScore(averageWaitTime)
  
  return {
    department: {
      totalTickets,
      averageWaitTime: Math.round(averageWaitTime * 100) / 100,
      medianWaitTime: Math.round(medianWaitTime * 100) / 100,
      maxWaitTime: Math.round(maxWaitTime * 100) / 100,
      minWaitTime: Math.round(minWaitTime * 100) / 100,
      efficiencyScore: departmentEfficiency,
      performanceGrade: getPerformanceGrade(averageWaitTime)
    },
    performanceGrades,
    technicianStats,
    trends: {
      // Could add trend analysis here
      improving: true, // Placeholder
      declining: false // Placeholder
    }
  }
}

function calculateEfficiencyScore(averageWaitTime: number): number {
  if (averageWaitTime <= 2) return 100
  if (averageWaitTime <= 4) return 80
  if (averageWaitTime <= 8) return 60
  if (averageWaitTime <= 16) return 40
  return 20
}

function getPerformanceGrade(averageWaitTime: number): string {
  if (averageWaitTime <= 2) return 'Excellent'
  if (averageWaitTime <= 4) return 'Good'
  if (averageWaitTime <= 8) return 'Average'
  return 'Needs Improvement'
}
