import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database schema for analytics...')
    
    // Test if the main table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Database schema not set up',
        message: 'Please run the ticket-lifecycle-schema-working.sql in Supabase first',
        details: tableError.message,
        instructions: [
          '1. Go to Supabase Dashboard → SQL Editor',
          '2. Copy and paste ticket-lifecycle-schema-working.sql',
          '3. Execute the script',
          '4. Refresh this page'
        ]
      }, { status: 404 })
    }
    
    // Test if the analytics view exists
    const { data: viewExists, error: viewError } = await supabaseAdmin
      .from('ticket_analytics_summary')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (viewError) {
      return NextResponse.json({
        success: false,
        error: 'Analytics view not found',
        message: 'The ticket_analytics_summary view is missing',
        details: viewError.message,
        instructions: [
          '1. Make sure you ran the complete ticket-lifecycle-schema-working.sql',
          '2. Check that all views were created successfully',
          '3. Try running the schema again'
        ]
      }, { status: 404 })
    }
    
    // Get basic counts
    const { count: totalTickets } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('*', { count: 'exact', head: true })
    
    const { count: syncOperations } = await supabaseAdmin
      .from('sync_operations')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      success: true,
      message: 'Database schema is properly set up',
      data: {
        ticketLifecycleTable: '✅ Exists',
        analyticsView: '✅ Exists',
        totalTickets: totalTickets || 0,
        syncOperations: syncOperations || 0,
        readyForSync: totalTickets === 0 ? 'No data yet - ready for first sync' : 'Data exists - ready for analytics'
      },
      nextSteps: totalTickets === 0 ? [
        '1. Go to Comprehensive Analytics tab',
        '2. Click "🧠 Smart Sync" button',
        '3. Wait for sync to complete',
        '4. View your analytics data'
      ] : [
        '1. Go to Comprehensive Analytics tab',
        '2. Click "🔄 Refresh" button',
        '3. View your analytics data'
      ]
    })
    
  } catch (error) {
    console.error('❌ Schema test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Schema test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        '1. Check your Supabase connection',
        '2. Verify the database schema is set up',
        '3. Try running ticket-lifecycle-schema-working.sql again'
      ]
    }, { status: 500 })
  }
}


