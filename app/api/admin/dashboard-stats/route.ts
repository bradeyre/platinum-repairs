import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllTickets } from '@/lib/repairshopr-new'

interface ProcessedTicket {
  ticketId: string
  ticketNumber: string
  description: string
  status: string
  timeAgo: string
  timestamp: Date
  deviceInfo: string
  assignedTo?: string
  aiPriority: string
  estimatedTime: string
  ticketType: 'PR' | 'DD'
  customFields?: Array<{
    id: number
    name: string
    value: string
  }>
  claimNumber?: string
}

// Helper function to calculate business hours between two dates
function getBusinessHours(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // Set to business hours (8 AM to 5 PM, Monday to Friday)
  const businessStartHour = 8
  const businessEndHour = 17
  
  let businessHours = 0
  const current = new Date(start)
  
  while (current < end) {
    const dayOfWeek = current.getDay()
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayStart = new Date(current)
      dayStart.setHours(businessStartHour, 0, 0, 0)
      
      const dayEnd = new Date(current)
      dayEnd.setHours(businessEndHour, 0, 0, 0)
      
      // Calculate hours for this day
      const dayStartTime = Math.max(dayStart.getTime(), start.getTime())
      const dayEndTime = Math.min(dayEnd.getTime(), end.getTime())
      
      if (dayStartTime < dayEndTime) {
        businessHours += (dayEndTime - dayStartTime) / (1000 * 60 * 60)
      }
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1)
    current.setHours(0, 0, 0, 0)
  }
  
  return businessHours
}

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date()
    startOfMonth.setMonth(startOfMonth.getMonth(), 1)

    console.log('🔧 Dashboard Stats: Starting to fetch data...')

    // Fetch tickets using the same function as the working tickets API
    const allTickets: ProcessedTicket[] = await getAllTickets()

    console.log(`🔧 Dashboard Stats: Found ${allTickets.length} tickets`)

    // Calculate stats from actual tickets
    const totalTickets = allTickets.length
    
    // Get tickets completed today (status = 'Completed')
    const completedToday = allTickets.filter(ticket => 
      ticket.status === 'Completed' && 
      new Date(ticket.timestamp).toISOString().split('T')[0] === today
    ).length

    // Get overdue tickets (older than 4 business hours and not completed)
    const now = new Date()
    const overdueTickets = allTickets.filter(ticket => {
      if (ticket.status === 'Completed') return false
      const ticketDate = new Date(ticket.timestamp)
      const businessHoursWaiting = getBusinessHours(ticketDate, now)
      return businessHoursWaiting > 4
    }).length

    // Get waiting tickets (not in progress, not troubleshooting, and not completed)
    const waitingTickets = allTickets.filter(ticket => 
      ticket.status !== 'In Progress' && ticket.status !== 'Troubleshooting' && ticket.status !== 'Completed'
    ).length


    // Get unassigned tickets
    const unassignedTickets = allTickets.filter(ticket => 
      !ticket.assignedTo || ticket.assignedTo === 'Unassigned'
    ).length

    // Calculate average wait time from actual tickets
    const currentTime = new Date()
    const ticketWaitTimes = allTickets
      .filter(ticket => ticket.status !== 'Completed')
      .map(ticket => {
        const ticketDate = new Date(ticket.timestamp)
        return getBusinessHours(ticketDate, currentTime)
      })

    const averageWaitTimeHours = ticketWaitTimes.length > 0 
      ? ticketWaitTimes.reduce((sum, hours) => sum + hours, 0) / ticketWaitTimes.length 
      : 0

    // Get technician stats (with error handling)
    let clockedInTechnicians = 0
    let totalTechnicians = 0
    let averageCompletionTime = 0
    let monthlyGrowth = 0

    try {
      // Get technician clock-in stats
      const { data: clockedInTechs } = await supabaseAdmin
        .from('technician_clock_ins')
        .select('technician_id')
        .is('clock_out_time', null)

      const { data: allTechnicians } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'technician')

      clockedInTechnicians = clockedInTechs?.length || 0
      totalTechnicians = allTechnicians?.length || 0

      // Calculate average completion time (in minutes)
      const { data: completedReports } = await supabaseAdmin
        .from('damage_reports')
        .select('created_at, updated_at')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString())

      if (completedReports && completedReports.length > 0) {
        const totalTime = completedReports.reduce((sum, report) => {
          const created = new Date(report.created_at)
          const completed = new Date(report.updated_at)
          return sum + (completed.getTime() - created.getTime())
        }, 0)
        averageCompletionTime = Math.floor(totalTime / completedReports.length / (1000 * 60)) // Convert to minutes
      }

      // Calculate monthly growth (compare this month vs last month)
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)

      const { data: thisMonthReports } = await supabaseAdmin
        .from('damage_reports')
        .select('id')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', new Date().toISOString())

      const { data: lastMonthReports } = await supabaseAdmin
        .from('damage_reports')
        .select('id')
        .gte('created_at', startOfLastMonth.toISOString())
        .lt('created_at', endOfLastMonth.toISOString())

      const thisMonthCount = thisMonthReports?.length || 0
      const lastMonthCount = lastMonthReports?.length || 0
      monthlyGrowth = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0

    } catch (dbError) {
      console.warn('⚠️ Some database queries failed, using defaults:', dbError)
      // Continue with default values
    }

    const stats = {
      totalTickets,
      waitingTickets,
      completedToday,
      overdueTickets,
      unassignedTickets,
      clockedInTechnicians,
      totalTechnicians,
      averageCompletionTime,
      monthlyGrowth,
      averageWaitTimeHours,
      // Default values for missing metrics
      totalActiveWorkHours: 0,
      averageActiveWorkHours: 0,
      waitTimeByTech: {},
      waitTimeByStatus: {}
    }

    console.log('🔧 Dashboard Stats: Calculated stats:', stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
