import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { technicianId, action } = await request.json()

    if (!technicianId || !action) {
      return NextResponse.json({ error: 'Missing technicianId or action' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === 'clock_in') {
      // Check if already clocked in
      const { data: existingClock } = await supabaseAdmin
        .from('technician_clock_ins')
        .select('*')
        .eq('technician_id', technicianId)
        .is('clock_out_time', null)
        .single()

      if (existingClock) {
        return NextResponse.json({ error: 'Technician is already clocked in' }, { status: 400 })
      }

      // Clock in
      const { data, error } = await supabaseAdmin
        .from('technician_clock_ins')
        .insert({
          technician_id: technicianId,
          clock_in_time: now,
          clock_out_time: null
        })
        .select()
        .single()

      if (error) {
        console.error('Error clocking in:', error)
        return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Clocked in successfully',
        clockInTime: now
      })

    } else if (action === 'clock_out') {
      // Find the current clock-in record
      const { data: clockInRecord } = await supabaseAdmin
        .from('technician_clock_ins')
        .select('*')
        .eq('technician_id', technicianId)
        .is('clock_out_time', null)
        .single()

      if (!clockInRecord) {
        return NextResponse.json({ error: 'No active clock-in found' }, { status: 400 })
      }

      // Calculate work time
      const clockInTime = new Date(clockInRecord.clock_in_time)
      const clockOutTime = new Date(now)
      const workMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60))

      // Update clock-out time
      const { error: updateError } = await supabaseAdmin
        .from('technician_clock_ins')
        .update({ clock_out_time: now })
        .eq('id', clockInRecord.id)

      if (updateError) {
        console.error('Error clocking out:', updateError)
        return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
      }

      // Record work hours for the day
      const workDate = now.split('T')[0]
      const { data: existingWorkHours } = await supabaseAdmin
        .from('technician_work_hours')
        .select('*')
        .eq('technician_id', technicianId)
        .eq('work_date', workDate)
        .single()

      if (existingWorkHours) {
        // Update existing record
        await supabaseAdmin
          .from('technician_work_hours')
          .update({ 
            total_minutes: existingWorkHours.total_minutes + workMinutes,
            updated_at: now
          })
          .eq('id', existingWorkHours.id)
      } else {
        // Create new record
        await supabaseAdmin
          .from('technician_work_hours')
          .insert({
            technician_id: technicianId,
            work_date: workDate,
            total_minutes: workMinutes,
            created_at: now,
            updated_at: now
          })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Clocked out successfully',
        workMinutes,
        clockOutTime: now
      })

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in clock-in/out:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
