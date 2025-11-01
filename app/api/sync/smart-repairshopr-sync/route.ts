import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllTickets, getAllCompletedTickets } from '@/lib/repairshopr-new'

export async function POST(request: NextRequest) {
  try {
    const { 
      syncType = 'smart', // 'smart', 'completed_only', 'full', 'incremental'
      maxAge = 7, // Only sync tickets completed at least this many days ago
      priority = 'all' // 'high', 'medium', 'low', 'all'
    } = await request.json()
    
    console.log('🔄 Starting Smart RepairShopr sync...', { syncType, maxAge, priority })
    
    // Create sync operation record
    const { data: syncOp } = await supabaseAdmin
      .from('sync_operations')
      .insert({
        sync_type: syncType,
        status: 'running',
        sync_config: {
          maxAge,
          priority,
          startedAt: new Date().toISOString()
        }
      })
      .select()
      .single()
    
    const syncOperationId = syncOp?.id
    
    try {
      // Fetch tickets from RepairShopr based on sync type
      let tickets
      if (syncType === 'completed_only' || syncType === 'smart') {
        tickets = await getAllCompletedTickets()
        console.log(`📊 Fetching completed tickets for ${syncType} sync`)
      } else {
        tickets = await getAllTickets()
        console.log(`📊 Fetching active tickets for ${syncType} sync`)
      }
      
      if (!tickets || tickets.length === 0) {
        throw new Error('No tickets found in RepairShopr')
      }
      
      console.log(`📊 Found ${tickets.length} tickets in RepairShopr`)
      
      let processedCount = 0
      let insertedCount = 0
      let updatedCount = 0
      let skippedCount = 0
      let errorCount = 0
      const errors: string[] = []
      
      // Filter tickets based on sync strategy
      const filteredTickets = filterTicketsForSync(tickets, syncType, maxAge, priority)
      console.log(`🎯 Filtered to ${filteredTickets.length} tickets for sync`)
      
      // Process each filtered ticket
      for (const ticket of filteredTickets) {
        try {
          const shouldProcess = await shouldProcessTicket(ticket, syncType, maxAge)
          
          if (!shouldProcess) {
            skippedCount++
            continue
          }
          
          // Check if ticket already exists
          const { data: existingTicket } = await supabaseAdmin
            .from('ticket_lifecycle')
            .select('id, last_synced_at, is_finalized, sync_priority')
            .eq('ticket_id', ticket.ticketId)
            .single()
          
          // Skip if not full sync and ticket was recently synced
          if (syncType !== 'full' && existingTicket && existingTicket.last_synced_at) {
            const lastSync = new Date(existingTicket.last_synced_at)
            const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
            
            // Skip if synced within last 24 hours (unless high priority)
            if (hoursSinceSync < 24 && existingTicket.sync_priority !== 1) {
              skippedCount++
              continue
            }
          }
          
          // Process the ticket
          const result = await processTicketForSync(ticket, existingTicket, syncType, maxAge)
          
          if (result.action === 'inserted') {
            insertedCount++
          } else if (result.action === 'updated') {
            updatedCount++
          }
          
          processedCount++
          
          // Log progress every 50 tickets
          if (processedCount % 50 === 0) {
            console.log(`📈 Processed ${processedCount}/${filteredTickets.length} tickets...`)
          }
          
        } catch (error) {
          console.error(`❌ Error processing ticket ${ticket.ticketNumber}:`, error)
          errorCount++
          errors.push(`Ticket ${ticket.ticketNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      // Update sync operation with results
      await supabaseAdmin
        .from('sync_operations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          tickets_processed: processedCount,
          tickets_inserted: insertedCount,
          tickets_updated: updatedCount,
          tickets_skipped: skippedCount,
          errors_count: errorCount,
          error_log: errors
        })
        .eq('id', syncOperationId)
      
      // Calculate summary statistics
      const summary = await calculateSmartSyncSummary()
      
      console.log('✅ Smart RepairShopr sync completed!', {
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount
      })
      
      return NextResponse.json({
        success: true,
        message: 'Smart RepairShopr sync completed successfully',
        syncOperationId,
        stats: {
          totalTicketsInRepairShopr: tickets.length,
          filteredTickets: filteredTickets.length,
          processed: processedCount,
          inserted: insertedCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errorCount
        },
        summary,
        errors: errors.length > 0 ? errors : undefined
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
    console.error('❌ Smart RepairShopr sync failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to sync RepairShopr data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to filter tickets based on sync strategy
function filterTicketsForSync(tickets: any[], syncType: string, maxAge: number, priority: string): any[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAge)
  
  return tickets.filter(ticket => {
    // Only process completed tickets for most sync types
    if (syncType === 'completed_only' || syncType === 'smart') {
      const isCompleted = ticket.status?.toLowerCase().includes('completed') || 
                         ticket.status?.toLowerCase().includes('closed')
      if (!isCompleted) return false
    }
    
    // For smart sync, only include tickets that are old enough to be finalized
    if (syncType === 'smart') {
      const ticketDate = new Date(ticket.timestamp)
      if (ticketDate > cutoffDate) return false
    }
    
    return true
  })
}

// Helper function to determine if a ticket should be processed
async function shouldProcessTicket(ticket: any, syncType: string, maxAge: number): Promise<boolean> {
  // For completed_only and smart sync, check if ticket is old enough
  if (syncType === 'completed_only' || syncType === 'smart') {
    const ticketDate = new Date(ticket.timestamp)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAge)
    
    return ticketDate <= cutoffDate
  }
  
  return true
}

// Enhanced ticket processing with smart syncing logic
async function processTicketForSync(ticket: any, existingTicket: any, syncType: string, maxAge: number): Promise<{ action: string }> {
  // Extract device info from description
  const deviceInfo = extractDeviceInfo(ticket.description)
  
  // Parse status history from ticket data
  const statusHistory = parseStatusHistory(ticket)
  
  // Parse comments
  const comments = parseComments(ticket)
  
  // Detect rework patterns
  const reworkInfo = detectReworkPattern(ticket, comments)
  
  // Calculate timing metrics
  const timingMetrics = calculateTimingMetrics(ticket, statusHistory)
  
  // Determine if ticket is finalized (completed and at least maxAge days old)
  const ticketDate = new Date(ticket.timestamp)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAge)
  const isFinalized = ticket.status?.toLowerCase().includes('completed') && ticketDate <= cutoffDate
  
  // Determine sync priority
  const syncPriority = getSyncPriority(ticket.status, ticketDate, isFinalized)
  
  // Calculate next sync time based on priority
  const nextSyncAt = calculateNextSyncTime(syncPriority)
  
  // Prepare ticket lifecycle data
  const ticketData = {
    ticket_id: ticket.ticketId,
    ticket_number: ticket.ticketNumber,
    subject: ticket.description?.substring(0, 200) || '',
    description: ticket.description || '',
    device_info: deviceInfo,
    customer_name: extractCustomerName(ticket),
    customer_email: extractCustomerEmail(ticket),
    customer_phone: extractCustomerPhone(ticket),
    
    current_status: ticket.status,
    status_history: statusHistory,
    priority: extractPriority(ticket),
    ticket_type: ticket.ticketType,
    
    assigned_technician_id: ticket.assignedTo || null,
    assigned_technician_name: ticket.assignedTo || null,
    assigned_at: null, // Will be populated from status changes
    created_at: new Date(ticket.timestamp).toISOString(),
    updated_at: new Date(ticket.timestamp).toISOString(),
    completed_at: ticket.status.toLowerCase().includes('completed') ? new Date(ticket.timestamp).toISOString() : null,
    
    total_duration_seconds: timingMetrics.totalDuration,
    active_work_time_seconds: timingMetrics.activeWorkTime,
    waiting_time_seconds: timingMetrics.waitingTime,
    
    comments: comments,
    internal_notes: extractInternalNotes(ticket),
    
    repair_type: extractRepairType(ticket.description),
    parts_used: extractPartsUsed(ticket.description),
    work_completed: extractWorkCompleted(ticket.description),
    testing_results: extractTestingResults(ticket.description),
    
    is_rework: reworkInfo.isRework,
    rework_reason: reworkInfo.reason,
    rework_count: reworkInfo.count,
    quality_score: calculateQualityScore(ticket, reworkInfo),
    
    labor_cost: extractLaborCost(ticket),
    parts_cost: extractPartsCost(ticket),
    total_cost: extractTotalCost(ticket),
    
    source_system: 'repairshopr',
    last_synced_at: new Date().toISOString(),
    
    // Smart syncing fields
    is_finalized: isFinalized,
    sync_priority: syncPriority,
    next_sync_at: nextSyncAt
  }
  
  if (existingTicket) {
    // Update existing ticket
    const { error: updateError } = await supabaseAdmin
      .from('ticket_lifecycle')
      .update(ticketData)
      .eq('ticket_id', ticket.ticketId)
    
    if (updateError) throw updateError
    
    // Process status changes and comments
    await processStatusChanges(ticket, statusHistory)
    await processComments(ticket, comments)
    
    return { action: 'updated' }
  } else {
    // Insert new ticket
    const { error: insertError } = await supabaseAdmin
      .from('ticket_lifecycle')
      .insert(ticketData)
    
    if (insertError) throw insertError
    
    // Process status changes and comments
    await processStatusChanges(ticket, statusHistory)
    await processComments(ticket, comments)
    
    return { action: 'inserted' }
  }
}

// Helper functions (same as before but with smart syncing logic)
function getSyncPriority(status: string, ticketDate: Date, isFinalized: boolean): number {
  if (isFinalized) return 1 // High priority: Completed and old
  if (status?.toLowerCase().includes('completed')) return 2 // Medium priority: Recently completed
  return 3 // Low priority: Active tickets
}

function calculateNextSyncTime(priority: number): string {
  const now = new Date()
  switch (priority) {
    case 1: return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Daily
    case 2: return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() // Every 3 days
    case 3: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() // Weekly
    default: return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Daily
  }
}

// Include all the helper functions from the original sync API
function extractDeviceInfo(description: string): string {
  if (!description) return ''
  
  const devicePatterns = [
    /iPhone\s+\d+/gi,
    /Samsung\s+Galaxy\s+\w+/gi,
    /iPad\s+\w+/gi,
    /MacBook\s+\w+/gi,
    /Huawei\s+\w+/gi,
    /OnePlus\s+\w+/gi
  ]
  
  for (const pattern of devicePatterns) {
    const match = description.match(pattern)
    if (match) return match[0]
  }
  
  return ''
}

function extractCustomerName(ticket: any): string { return '' }
function extractCustomerEmail(ticket: any): string { return '' }
function extractCustomerPhone(ticket: any): string { return '' }
function extractPriority(ticket: any): string { return 'Normal' }

function parseStatusHistory(ticket: any): any[] {
  return [{
    status: ticket.status,
    timestamp: ticket.timestamp,
    changed_by: 'system'
  }]
}

function parseComments(ticket: any): any[] {
  if (ticket.comments && Array.isArray(ticket.comments)) {
    return ticket.comments.map((comment: any) => ({
      text: comment.text || comment.body || comment.comment,
      author: comment.author || comment.user || 'Unknown',
      timestamp: comment.date || comment.created_at || ticket.timestamp,
      is_internal: comment.internal || false
    }))
  }
  return []
}

function detectReworkPattern(ticket: any, comments: any[]): { isRework: boolean, reason: string, count: number } {
  const reworkKeywords = ['rework', 'redo', 'fix again', 'not working', 'still broken', 'returned', 'failed']
  
  let reworkCount = 0
  let reworkReason = ''
  
  const description = (ticket.description || '').toLowerCase()
  for (const keyword of reworkKeywords) {
    if (description.includes(keyword)) {
      reworkCount++
      reworkReason = `Rework detected in description: ${keyword}`
      break
    }
  }
  
  for (const comment of comments) {
    const commentText = (comment.text || '').toLowerCase()
    for (const keyword of reworkKeywords) {
      if (commentText.includes(keyword)) {
        reworkCount++
        reworkReason = `Rework detected in comment: ${keyword}`
        break
      }
    }
  }
  
  return {
    isRework: reworkCount > 0,
    reason: reworkReason,
    count: reworkCount
  }
}

function calculateTimingMetrics(ticket: any, statusHistory: any[]): { totalDuration: number, activeWorkTime: number, waitingTime: number } {
  const created = new Date(ticket.timestamp)
  const now = new Date()
  const totalDuration = Math.floor((now.getTime() - created.getTime()) / 1000)
  const activeWorkTime = Math.floor(totalDuration * 0.3)
  const waitingTime = Math.floor(totalDuration * 0.7)
  
  return { totalDuration, activeWorkTime, waitingTime }
}

function extractInternalNotes(ticket: any): any[] { return [] }
function extractRepairType(description: string): string {
  if (!description) return 'General Repair'
  
  const lower = description.toLowerCase()
  
  if (lower.includes('screen') || lower.includes('display') || lower.includes('lcd')) {
    return 'Screen Repair'
  } else if (lower.includes('battery')) {
    return 'Battery Replacement'
  } else if (lower.includes('charging') || lower.includes('port')) {
    return 'Charging Port'
  } else if (lower.includes('camera')) {
    return 'Camera Repair'
  } else if (lower.includes('water') || lower.includes('liquid')) {
    return 'Water Damage'
  } else if (lower.includes('software') || lower.includes('update') || lower.includes('reset')) {
    return 'Software Issue'
  } else if (lower.includes('button') || lower.includes('home')) {
    return 'Button Repair'
  }
  
  return 'General Repair'
}

function extractPartsUsed(description: string): any[] { return [] }
function extractWorkCompleted(description: string): string { return description || '' }
function extractTestingResults(description: string): string { return '' }

function calculateQualityScore(ticket: any, reworkInfo: any): number {
  let score = 5.0
  if (reworkInfo.isRework) score -= 2.0
  if (reworkInfo.count > 1) score -= 1.0
  return Math.max(0, score)
}

function extractLaborCost(ticket: any): number { return 0 }
function extractPartsCost(ticket: any): number { return 0 }
function extractTotalCost(ticket: any): number { return 0 }

async function processStatusChanges(ticket: any, statusHistory: any[]): Promise<void> {
  for (const statusChange of statusHistory) {
    const statusData = {
      ticket_id: ticket.ticketId,
      ticket_number: ticket.ticketNumber,
      from_status: statusChange.fromStatus || null,
      to_status: statusChange.status,
      changed_at: new Date(statusChange.timestamp).toISOString(),
      changed_by: statusChange.changed_by || 'system',
      comment: statusChange.comment || null,
      internal_note: statusChange.internal || false,
      duration_since_last_change: statusChange.duration || 0,
      business_hours_since_last_change: 0,
      source_system: 'repairshopr'
    }
    
    await supabaseAdmin
      .from('ticket_status_changes')
      .upsert(statusData, { onConflict: 'ticket_id,changed_at' })
  }
}

async function processComments(ticket: any, comments: any[]): Promise<void> {
  for (const comment of comments) {
    const commentData = {
      ticket_id: ticket.ticketId,
      ticket_number: ticket.ticketNumber,
      comment_text: comment.text,
      comment_type: comment.is_internal ? 'internal' : 'customer',
      author_name: comment.author,
      author_email: null,
      is_internal: comment.is_internal || false,
      created_at: new Date(comment.timestamp).toISOString(),
      contains_rework_keywords: detectReworkKeywords(comment.text),
      contains_quality_issues: detectQualityIssues(comment.text),
      contains_parts_info: detectPartsInfo(comment.text),
      contains_time_info: detectTimeInfo(comment.text),
      source_system: 'repairshopr'
    }
    
    await supabaseAdmin
      .from('ticket_comments')
      .upsert(commentData, { onConflict: 'ticket_id,created_at,author_name' })
  }
}

function detectReworkKeywords(text: string): boolean {
  const reworkKeywords = ['rework', 'redo', 'fix again', 'not working', 'still broken']
  const lower = text.toLowerCase()
  return reworkKeywords.some(keyword => lower.includes(keyword))
}

function detectQualityIssues(text: string): boolean {
  const qualityKeywords = ['quality', 'defect', 'issue', 'problem', 'fault']
  const lower = text.toLowerCase()
  return qualityKeywords.some(keyword => lower.includes(keyword))
}

function detectPartsInfo(text: string): boolean {
  const partsKeywords = ['part', 'component', 'replacement', 'battery', 'screen']
  const lower = text.toLowerCase()
  return partsKeywords.some(keyword => lower.includes(keyword))
}

function detectTimeInfo(text: string): boolean {
  const timeKeywords = ['hour', 'minute', 'time', 'duration', 'took']
  const lower = text.toLowerCase()
  return timeKeywords.some(keyword => lower.includes(keyword))
}

async function calculateSmartSyncSummary(): Promise<any> {
  const { data: summary } = await supabaseAdmin
    .from('ticket_lifecycle')
    .select(`
      COUNT(*) as total_tickets,
      COUNT(CASE WHEN current_status = 'Completed' THEN 1 END) as completed_tickets,
      COUNT(CASE WHEN is_rework = true THEN 1 END) as rework_tickets,
      COUNT(CASE WHEN is_finalized = true THEN 1 END) as finalized_tickets,
      AVG(total_duration_seconds) as avg_duration_seconds,
      AVG(active_work_time_seconds) as avg_active_work_seconds
    `)
    .single()
  
  return summary
}
