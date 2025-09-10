import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all technicians
    const { data: technicians, error: techError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'technician')

    if (techError) {
      console.error('Error fetching technicians:', techError)
      return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 })
    }

    // Get work time data for each technician
    const techniciansWithWorkData = await Promise.all(
      technicians.map(async (tech) => {
        const today = new Date().toISOString().split('T')[0]
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        const startOfMonth = new Date()
        startOfMonth.setMonth(startOfMonth.getMonth(), 1)

        // Get clock-in status and times
        const { data: clockData } = await supabaseAdmin
          .from('technician_clock_ins')
          .select('*')
          .eq('technician_id', tech.id)
          .order('clock_in_time', { ascending: false })
          .limit(1)
          .single()

        const isClockedIn = clockData && !clockData.clock_out_time
        const clockInTime = clockData?.clock_in_time

        // Calculate work hours for different timeframes
        const { data: todayHours } = await supabaseAdmin
          .from('technician_work_hours')
          .select('total_minutes')
          .eq('technician_id', tech.id)
          .eq('work_date', today)
          .single()

        const { data: weekHours } = await supabaseAdmin
          .from('technician_work_hours')
          .select('total_minutes')
          .eq('technician_id', tech.id)
          .gte('work_date', startOfWeek.toISOString().split('T')[0])
          .lte('work_date', today)

        const { data: monthHours } = await supabaseAdmin
          .from('technician_work_hours')
          .select('total_minutes')
          .eq('technician_id', tech.id)
          .gte('work_date', startOfMonth.toISOString().split('T')[0])
          .lte('work_date', today)

        // Get completed tickets count
        const { data: todayTickets } = await supabaseAdmin
          .from('damage_reports')
          .select('id')
          .eq('assigned_tech_id', tech.id)
          .eq('status', 'completed')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)

        const { data: weekTickets } = await supabaseAdmin
          .from('damage_reports')
          .select('id')
          .eq('assigned_tech_id', tech.id)
          .eq('status', 'completed')
          .gte('created_at', startOfWeek.toISOString())
          .lt('created_at', new Date().toISOString())

        const { data: monthTickets } = await supabaseAdmin
          .from('damage_reports')
          .select('id')
          .eq('assigned_tech_id', tech.id)
          .eq('status', 'completed')
          .gte('created_at', startOfMonth.toISOString())
          .lt('created_at', new Date().toISOString())

        return {
          ...tech,
          is_clocked_in: isClockedIn,
          clock_in_time: clockInTime,
          total_hours_today: todayHours?.total_minutes ? Math.round(todayHours.total_minutes / 60 * 100) / 100 : 0,
          total_hours_this_week: weekHours ? weekHours.reduce((sum, h) => sum + (h.total_minutes || 0), 0) / 60 : 0,
          total_hours_this_month: monthHours ? monthHours.reduce((sum, h) => sum + (h.total_minutes || 0), 0) / 60 : 0,
          tickets_completed_today: todayTickets?.length || 0,
          tickets_completed_this_week: weekTickets?.length || 0,
          tickets_completed_this_month: monthTickets?.length || 0
        }
      })
    )

    return NextResponse.json({ technicians: techniciansWithWorkData })
  } catch (error) {
    console.error('Error fetching technician work data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
