import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...')
    
    // Simple test query
    const { data, error } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message,
        suggestion: 'Check if ticket-lifecycle-schema-working.sql was run successfully'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        tableExists: true,
        recordCount: data || 0
      }
    })
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


