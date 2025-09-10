import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date()
    startOfMonth.setMonth(startOfMonth.getMonth(), 1)

    // Get total tickets from RepairShopr (this would need to be fetched from the tickets API)
    // For now, we'll get damage reports as a proxy
    const { data: allReports } = await supabaseAdmin
      .from('damage_reports')
      .select('id, status, created_at, total_parts_cost')

    // Get tickets completed today
    const { data: completedToday } = await supabaseAdmin
      .from('damage_reports')
      .select('id')
      .eq('status', 'completed')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    // Get overdue tickets (older than 3 days and not completed)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const { data: overdueTickets } = await supabaseAdmin
      .from('damage_reports')
      .select('id')
      .neq('status', 'completed')
      .lt('created_at', threeDaysAgo.toISOString())

    // Get waiting tickets
    const { data: waitingTickets } = await supabaseAdmin
      .from('damage_reports')
      .select('id')
      .eq('status', 'awaiting_approval')

    // Get unassigned tickets
    const { data: unassignedTickets } = await supabaseAdmin
      .from('damage_reports')
      .select('id')
      .is('assigned_tech_id', null)

    // Get technician clock-in stats
    const { data: clockedInTechs } = await supabaseAdmin
      .from('technician_clock_ins')
      .select('technician_id')
      .is('clock_out_time', null)

    const { data: allTechnicians } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'technician')

    // Calculate average completion time (in minutes)
    const { data: completedReports } = await supabaseAdmin
      .from('damage_reports')
      .select('created_at, updated_at')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString())

    let averageCompletionTime = 0
    if (completedReports && completedReports.length > 0) {
      const totalTime = completedReports.reduce((sum, report) => {
        const created = new Date(report.created_at)
        const completed = new Date(report.updated_at)
        return sum + (completed.getTime() - created.getTime())
      }, 0)
      averageCompletionTime = Math.floor(totalTime / completedReports.length / (1000 * 60)) // Convert to minutes
    }

    // Get wait time statistics
    const { data: waitTimes } = await supabaseAdmin
      .from('ticket_wait_times')
      .select('*')
      .gte('completed_at', startOfMonth.toISOString())

    // Calculate average wait time by technician
    const waitTimeByTech = waitTimes?.reduce((acc: any, wait: any) => {
      if (!acc[wait.technician_id]) {
        acc[wait.technician_id] = { total: 0, count: 0 }
      }
      acc[wait.technician_id].total += wait.wait_time_hours
      acc[wait.technician_id].count += 1
      return acc
    }, {}) || {}

    // Calculate average wait time by status
    const waitTimeByStatus = waitTimes?.reduce((acc: any, wait: any) => {
      if (!acc[wait.new_status]) {
        acc[wait.new_status] = { total: 0, count: 0 }
      }
      acc[wait.new_status].total += wait.wait_time_hours
      acc[wait.new_status].count += 1
      return acc
    }, {}) || {}

    // Get active work time from technician_work_hours
    const { data: workHours } = await supabaseAdmin
      .from('technician_work_hours')
      .select('*')
      .gte('date', startOfMonth.toISOString().split('T')[0])

    const totalActiveWorkHours = workHours?.reduce((sum, work) => sum + (work.total_minutes || 0), 0) || 0
    const averageActiveWorkHours = workHours?.length ? totalActiveWorkHours / workHours.length : 0

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
    const monthlyGrowth = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0

    const stats = {
      totalTickets: allReports?.length || 0,
      waitingTickets: waitingTickets?.length || 0,
      completedToday: completedToday?.length || 0,
      overdueTickets: overdueTickets?.length || 0,
      unassignedTickets: unassignedTickets?.length || 0,
      clockedInTechnicians: clockedInTechs?.length || 0,
      totalTechnicians: allTechnicians?.length || 0,
      averageCompletionTime,
      monthlyGrowth,
      // New performance metrics
      averageWaitTimeHours: waitTimes?.length ? waitTimes.reduce((sum, w) => sum + w.wait_time_hours, 0) / waitTimes.length : 0,
      totalActiveWorkHours: totalActiveWorkHours / 60, // Convert minutes to hours
      averageActiveWorkHours: averageActiveWorkHours / 60, // Convert minutes to hours
      waitTimeByTech,
      waitTimeByStatus
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
