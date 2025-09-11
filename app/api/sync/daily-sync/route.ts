import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting daily sync operation...')
    
    // Check if there's already a sync running
    const { data: runningSync } = await supabaseAdmin
      .from('sync_operations')
      .select('id')
      .eq('status', 'running')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
      .single()
    
    if (runningSync) {
      return NextResponse.json({
        success: false,
        message: 'Sync already running',
        syncId: runningSync.id
      })
    }
    
    // Get tickets that are ready for sync
    const { data: ticketsReadyForSync } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('ticket_id, sync_priority, is_finalized')
      .lte('next_sync_at', new Date().toISOString())
      .order('sync_priority', { ascending: true })
      .order('next_sync_at', { ascending: true })
    
    if (!ticketsReadyForSync || ticketsReadyForSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tickets ready for sync',
        stats: {
          ticketsReady: 0,
          processed: 0
        }
      })
    }
    
    console.log(`📊 Found ${ticketsReadyForSync.length} tickets ready for sync`)
    
    // Create sync operation record
    const { data: syncOp } = await supabaseAdmin
      .from('sync_operations')
      .insert({
        sync_type: 'daily',
        status: 'running',
        sync_config: {
          ticketsReady: ticketsReadyForSync.length,
          startedAt: new Date().toISOString()
        }
      })
      .select()
      .single()
    
    const syncOperationId = syncOp?.id
    
    try {
      // Call the smart sync API with appropriate parameters
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sync/smart-repairshopr-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType: 'smart',
          maxAge: 7, // Only sync tickets completed at least 1 week ago
          priority: 'all'
        })
      })
      
      if (!syncResponse.ok) {
        throw new Error('Smart sync API call failed')
      }
      
      const syncResult = await syncResponse.json()
      
      // Update the daily sync operation with results
      await supabaseAdmin
        .from('sync_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          tickets_processed: syncResult.stats?.processed || 0,
          tickets_inserted: syncResult.stats?.inserted || 0,
          tickets_updated: syncResult.stats?.updated || 0,
          tickets_skipped: syncResult.stats?.skipped || 0,
          errors_count: syncResult.stats?.errors || 0,
          error_log: syncResult.errors || []
        })
        .eq('id', syncOperationId)
      
      console.log('✅ Daily sync completed successfully!')
      
      return NextResponse.json({
        success: true,
        message: 'Daily sync completed successfully',
        syncOperationId,
        stats: syncResult.stats,
        summary: syncResult.summary
      })
      
    } catch (error) {
      // Update sync operation with error
      await supabaseAdmin
        .from('sync_operations')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_log: [error instanceof Error ? error.message : 'Unknown error']
        })
        .eq('id', syncOperationId)
      
      throw error
    }
    
  } catch (error) {
    console.error('❌ Daily sync failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Daily sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    // Get recent sync operations
    const { data: recentSyncs } = await supabaseAdmin
      .from('sync_operations')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
    
    // Get sync statistics (simplified query)
    const { data: allSyncs } = await supabaseAdmin
      .from('sync_operations')
      .select('sync_type, status, tickets_processed, started_at')
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    
    // Process sync statistics manually
    const syncStats = allSyncs?.reduce((acc: any, sync: any) => {
      if (!acc[sync.sync_type]) {
        acc[sync.sync_type] = {
          sync_type: sync.sync_type,
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          avg_tickets_processed: 0,
          last_sync: null
        }
      }
      
      acc[sync.sync_type].total_syncs++
      if (sync.status === 'completed') acc[sync.sync_type].successful_syncs++
      if (sync.status === 'failed') acc[sync.sync_type].failed_syncs++
      acc[sync.sync_type].avg_tickets_processed += sync.tickets_processed || 0
      if (!acc[sync.sync_type].last_sync || sync.started_at > acc[sync.sync_type].last_sync) {
        acc[sync.sync_type].last_sync = sync.started_at
      }
      
      return acc
    }, {}) || {}
    
    // Calculate averages
    Object.values(syncStats).forEach((stat: any) => {
      if (stat.total_syncs > 0) {
        stat.avg_tickets_processed = stat.avg_tickets_processed / stat.total_syncs
      }
    })
    
    // Get tickets ready for next sync (simplified query)
    const { data: allTickets } = await supabaseAdmin
      .from('ticket_lifecycle')
      .select('sync_priority')
      .lte('next_sync_at', new Date().toISOString())
    
    // Process tickets ready for sync manually
    const ticketsReady = allTickets?.reduce((acc: any, ticket: any) => {
      const priority = ticket.sync_priority || 3
      if (!acc[priority]) {
        acc[priority] = { sync_priority: priority, count: 0 }
      }
      acc[priority].count++
      return acc
    }, {}) || {}
    
    return NextResponse.json({
      success: true,
      recentSyncs: recentSyncs || [],
      syncStats: Object.values(syncStats) || [],
      ticketsReadyForSync: Object.values(ticketsReady) || [],
      lastChecked: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error checking sync status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
