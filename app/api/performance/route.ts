import { NextRequest, NextResponse } from 'next/server'
import { fetchActivityLogs, processActivityLogs, calculateMonthlyPerformance } from '@/lib/performance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '0')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    
    // Calculate date range for the month
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    
    // Fetch activity logs and process performance data
    const activityLogs = await fetchActivityLogs(startDate, endDate)
    const dailyStats = processActivityLogs(activityLogs)
    const monthlyPerformance = calculateMonthlyPerformance(dailyStats)
    
    // Convert to technician stats format for leaderboard
    const technicians = monthlyPerformance.map(perf => ({
      name: perf.name,
      workMinutes: perf.monthlyTotals.totalActiveHours * 60,
      efficiency: perf.monthlyTotals.avgEfficiency,
      ticketsCompleted: perf.monthlyTotals.ticketsCompleted,
      avgRepairTime: perf.monthlyTotals.avgRepairTime,
      monthlyHours: perf.monthlyTotals.totalActiveHours,
      rank: perf.monthlyTotals.rank,
      isTopPerformer: perf.monthlyTotals.rank === 1 && perf.monthlyTotals.avgEfficiency >= 85
    }))
    
    return NextResponse.json({
      technicians,
      month,
      year,
      totalTechnicians: technicians.length
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}