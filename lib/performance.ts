export interface ActivityLog {
  technicianName: string
  timestamp: Date
  activityType: 'ticket_start' | 'ticket_complete' | 'break_start' | 'break_end' | 'login' | 'logout'
  ticketId?: string
  duration?: number
}

export interface DailyStats {
  date: string
  technicianName: string
  totalActiveMinutes: number
  breakMinutes: number
  idleMinutes: number
  ticketsCompleted: number
  efficiency: number
}

export interface TechnicianPerformance {
  name: string
  dailyStats: DailyStats[]
  monthlyTotals: {
    totalActiveHours: number
    avgEfficiency: number
    ticketsCompleted: number
    avgRepairTime: number
    rank: number
  }
}

// Business hours: 8 AM to 6 PM (480 minutes per day)
const BUSINESS_DAY_MINUTES = 480
const BUSINESS_START_HOUR = 8
const BUSINESS_END_HOUR = 18

export function calculateBusinessMinutes(startTime: Date, endTime: Date): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  // Ensure we're within business hours
  const businessStart = new Date(start)
  businessStart.setHours(BUSINESS_START_HOUR, 0, 0, 0)
  
  const businessEnd = new Date(start)
  businessEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0)
  
  // Clamp times to business hours
  const clampedStart = new Date(Math.max(start.getTime(), businessStart.getTime()))
  const clampedEnd = new Date(Math.min(end.getTime(), businessEnd.getTime()))
  
  if (clampedStart >= clampedEnd) return 0
  
  return Math.round((clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60))
}

export function calculateDailyEfficiency(activeMinutes: number): number {
  return Math.round((activeMinutes / BUSINESS_DAY_MINUTES) * 100)
}

export function isBusinessHour(timestamp: Date): boolean {
  const hour = timestamp.getHours()
  const day = timestamp.getDay()
  
  // Monday = 1, Friday = 5 (exclude weekends)
  return day >= 1 && day <= 5 && hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR
}

export function processActivityLogs(logs: ActivityLog[]): DailyStats[] {
  const dailyStatsMap = new Map<string, DailyStats>()
  
  // Group logs by technician and date
  const groupedLogs = logs.reduce((acc, log) => {
    if (!isBusinessHour(log.timestamp)) return acc
    
    const dateKey = log.timestamp.toISOString().split('T')[0]
    const key = `${log.technicianName}-${dateKey}`
    
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(log)
    return acc
  }, {} as Record<string, ActivityLog[]>)
  
  // Calculate stats for each technician-date combination
  Object.entries(groupedLogs).forEach(([key, dayLogs]) => {
    const [technicianName, date] = key.split('-')
    
    let totalActiveMinutes = 0
    let breakMinutes = 0
    let ticketsCompleted = 0
    
    // Sort logs by timestamp
    dayLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    let currentActivity: ActivityLog | null = null
    
    for (const log of dayLogs) {
      if (log.activityType === 'ticket_start') {
        currentActivity = log
      } else if (log.activityType === 'ticket_complete' && currentActivity) {
        const workTime = calculateBusinessMinutes(currentActivity.timestamp, log.timestamp)
        totalActiveMinutes += workTime
        ticketsCompleted++
        currentActivity = null
      } else if (log.activityType === 'break_start') {
        currentActivity = log
      } else if (log.activityType === 'break_end' && currentActivity) {
        const breakTime = calculateBusinessMinutes(currentActivity.timestamp, log.timestamp)
        breakMinutes += breakTime
        currentActivity = null
      }
    }
    
    const idleMinutes = BUSINESS_DAY_MINUTES - totalActiveMinutes - breakMinutes
    const efficiency = calculateDailyEfficiency(totalActiveMinutes)
    
    dailyStatsMap.set(key, {
      date,
      technicianName,
      totalActiveMinutes,
      breakMinutes,
      idleMinutes: Math.max(0, idleMinutes),
      ticketsCompleted,
      efficiency
    })
  })
  
  return Array.from(dailyStatsMap.values())
}

export function calculateMonthlyPerformance(dailyStats: DailyStats[]): TechnicianPerformance[] {
  const technicianMap = new Map<string, DailyStats[]>()
  
  // Group by technician
  dailyStats.forEach(stats => {
    const existing = technicianMap.get(stats.technicianName) || []
    existing.push(stats)
    technicianMap.set(stats.technicianName, existing)
  })
  
  const performances: TechnicianPerformance[] = []
  
  technicianMap.forEach((stats, name) => {
    const totalActiveMinutes = stats.reduce((sum, day) => sum + day.totalActiveMinutes, 0)
    const totalTickets = stats.reduce((sum, day) => sum + day.ticketsCompleted, 0)
    const avgEfficiency = stats.reduce((sum, day) => sum + day.efficiency, 0) / stats.length
    const avgRepairTime = totalActiveMinutes / Math.max(totalTickets, 1)
    
    performances.push({
      name,
      dailyStats: stats,
      monthlyTotals: {
        totalActiveHours: Math.round(totalActiveMinutes / 60),
        avgEfficiency: Math.round(avgEfficiency),
        ticketsCompleted: totalTickets,
        avgRepairTime: Math.round(avgRepairTime),
        rank: 0 // Will be set after sorting
      }
    })
  })
  
  // Sort by efficiency and assign ranks
  performances.sort((a, b) => b.monthlyTotals.avgEfficiency - a.monthlyTotals.avgEfficiency)
  performances.forEach((perf, index) => {
    perf.monthlyTotals.rank = index + 1
  })
  
  return performances
}

export interface DailyWorkLog {
  date: string
  technicianName: string
  startTime: Date | null
  endTime: Date | null
  totalHours: number
  breaks: Array<{
    startTime: Date
    endTime: Date
    duration: number
  }>
  tickets: Array<{
    ticketId: string
    startTime: Date
    endTime: Date
    duration: number
  }>
}

// Real activity log fetching - replace with actual API calls
export async function fetchActivityLogs(startDate: Date, endDate: Date): Promise<ActivityLog[]> {
  // TODO: Replace with actual API call to fetch activity logs
  // This should fetch real data from your activity logging system
  try {
    const response = await fetch(`/api/activity-logs?start=${startDate.toISOString()}&end=${endDate.toISOString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch activity logs')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }
}

export function generateDailyWorkLogs(activityLogs: ActivityLog[]): DailyWorkLog[] {
  const workLogMap = new Map<string, DailyWorkLog>()
  
  // Group logs by technician and date
  activityLogs.forEach(log => {
    if (!isBusinessHour(log.timestamp)) return
    
    const dateKey = log.timestamp.toISOString().split('T')[0]
    const key = `${log.technicianName}-${dateKey}`
    
    if (!workLogMap.has(key)) {
      workLogMap.set(key, {
        date: dateKey,
        technicianName: log.technicianName,
        startTime: null,
        endTime: null,
        totalHours: 0,
        breaks: [],
        tickets: []
      })
    }
    
    const workLog = workLogMap.get(key)!
    
    // Track login/logout times
    if (log.activityType === 'login') {
      if (!workLog.startTime || log.timestamp < workLog.startTime) {
        workLog.startTime = log.timestamp
      }
    } else if (log.activityType === 'logout') {
      if (!workLog.endTime || log.timestamp > workLog.endTime) {
        workLog.endTime = log.timestamp
      }
    }
  })
  
  // Calculate total hours for each work log
  workLogMap.forEach((workLog) => {
    if (workLog.startTime && workLog.endTime) {
      workLog.totalHours = calculateBusinessMinutes(workLog.startTime, workLog.endTime) / 60
    }
  })
  
  return Array.from(workLogMap.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}