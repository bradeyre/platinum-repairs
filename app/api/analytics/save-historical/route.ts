import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { stats, timestamp } = await request.json()
    
    if (!stats || !timestamp) {
      return NextResponse.json(
        { error: 'Stats and timestamp are required' },
        { status: 400 }
      )
    }
    
    // Prepare data for insertion
    const historicalRecord = {
      date: new Date(timestamp).toISOString().split('T')[0],
      total_tickets: stats.totalTickets || 0,
      completed_tickets: stats.completedToday || 0,
      waiting_tickets: stats.waitingTickets || 0,
      overdue_tickets: stats.overdueTickets || 0,
      average_wait_time: stats.averageWaitTime || 0,
      total_technicians: stats.totalTechnicians || 0,
      active_technicians: stats.activeTechnicians || 0,
      rework_rate: stats.reworkRate || 0,
      total_reworks: stats.totalReworks || 0,
      efficiency: stats.efficiency || 0,
      first_time_fix_rate: stats.firstTimeFixRate || 95,
      customer_satisfaction: stats.customerSatisfaction || 85,
      created_at: new Date().toISOString()
    }
    
    // Insert or update historical record
    const { data, error } = await supabaseAdmin
      .from('analytics_historical')
      .upsert(historicalRecord, {
        onConflict: 'date'
      })
      .select()
    
    if (error) {
      console.error('Error saving historical data:', error)
      return NextResponse.json(
        { error: 'Failed to save historical data', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: data?.[0],
      message: 'Historical data saved successfully'
    })
    
  } catch (error) {
    console.error('Error saving historical analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
