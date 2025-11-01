import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test database connection and table existence
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('analytics_historical')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.error('Table check error:', tableError)
      return NextResponse.json({
        success: false,
        error: 'analytics_historical table does not exist or has issues',
        details: tableError.message,
        suggestion: 'Run the database-cleanup.sql script in your Supabase database'
      }, { status: 500 })
    }
    
    // Get current data count
    const { count, error: countError } = await supabaseAdmin
      .from('analytics_historical')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Count error:', countError)
      return NextResponse.json({
        success: false,
        error: 'Failed to count records',
        details: countError.message
      }, { status: 500 })
    }
    
    // Get sample data
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('analytics_historical')
      .select('*')
      .order('date', { ascending: false })
      .limit(5)
    
    if (sampleError) {
      console.error('Sample data error:', sampleError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch sample data',
        details: sampleError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Analytics database is working correctly',
      data: {
        recordCount: count || 0,
        sampleData: sampleData || [],
        tableExists: true
      }
    })
    
  } catch (error) {
    console.error('Analytics test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create a test record
    const testRecord = {
      date: new Date().toISOString().split('T')[0],
      total_tickets: 10,
      completed_tickets: 8,
      waiting_tickets: 2,
      overdue_tickets: 0,
      average_wait_time: 24.5,
      total_technicians: 4,
      active_technicians: 3,
      rework_rate: 5.2,
      total_reworks: 1,
      efficiency: 85.5,
      first_time_fix_rate: 95.0,
      customer_satisfaction: 88.0
    }
    
    const { data, error } = await supabaseAdmin
      .from('analytics_historical')
      .upsert(testRecord, {
        onConflict: 'date'
      })
      .select()
    
    if (error) {
      console.error('Test record creation error:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create test record',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test record created successfully',
      data: data?.[0]
    })
    
  } catch (error) {
    console.error('Test record creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
