import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function POST(request: NextRequest) {
  try {
    const { fullSync = false, dateFrom, dateTo } = await request.json()
    
    console.log('🔄 Starting RepairShopr data sync...', { fullSync, dateFrom, dateTo })
    
    // Fetch all tickets from RepairShopr
    const tickets = await getAllTickets()
    
    if (!tickets || tickets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No tickets found in RepairShopr',
        message: 'Check RepairShopr API connection and credentials'
      }, { status: 400 })
    }
    
    console.log(`📊 Found ${tickets.length} tickets in RepairShopr`)
    
    let processedCount = 0
    let updatedCount = 0
    let insertedCount = 0
    let errorCount = 0
    
    // Process each ticket
    for (const ticket of tickets) {
      try {
        // Filter by date range if specified
        if (dateFrom || dateTo) {
          const ticketDate = new Date(ticket.timestamp)
          if (dateFrom && ticketDate < new Date(dateFrom)) continue
          if (dateTo && ticketDate > new Date(dateTo)) continue
        }
        
        // Check if ticket already exists
        const { data: existingTicket } = await supabaseAdmin
          .from('ticket_lifecycle')
          .select('id, last_synced_at')
          .eq('ticket_id', ticket.ticketId)
          .single()
        
        // Skip if not full sync and ticket was recently synced
        if (!fullSync && existingTicket && existingTicket.last_synced_at) {
          const lastSync = new Date(existingTicket.last_synced_at)
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
          if (hoursSinceSync < 24) { // Skip if synced within last 24 hours
            continue
          }
        }
        
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
          last_synced_at: new Date().toISOString()
        }
        
        if (existingTicket) {
          // Update existing ticket
          const { error: updateError } = await supabaseAdmin
            .from('ticket_lifecycle')
            .update(ticketData)
            .eq('ticket_id', ticket.ticketId)
          
          if (updateError) throw updateError
          updatedCount++
        } else {
          // Insert new ticket
          const { error: insertError } = await supabaseAdmin
            .from('ticket_lifecycle')
            .insert(ticketData)
          
          if (insertError) throw insertError
          insertedCount++
        }
        
        // Process status changes
        await processStatusChanges(ticket, statusHistory)
        
        // Process comments
        await processComments(ticket, comments)
        
        processedCount++
        
        // Log progress every 50 tickets
        if (processedCount % 50 === 0) {
          console.log(`📈 Processed ${processedCount}/${tickets.length} tickets...`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing ticket ${ticket.ticketNumber}:`, error)
        errorCount++
      }
    }
    
    // Calculate summary statistics
    const summary = await calculateSyncSummary()
    
    console.log('✅ RepairShopr data sync completed!', {
      processed: processedCount,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount
    })
    
    return NextResponse.json({
      success: true,
      message: 'RepairShopr data sync completed successfully',
      stats: {
        totalTicketsInRepairShopr: tickets.length,
        processed: processedCount,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      },
      summary
    })
    
  } catch (error) {
    console.error('❌ RepairShopr data sync failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to sync RepairShopr data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions
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

function extractCustomerName(ticket: any): string {
  // Extract from description or other fields
  return ''
}

function extractCustomerEmail(ticket: any): string {
  // Extract from description or other fields
  return ''
}

function extractCustomerPhone(ticket: any): string {
  // Extract from description or other fields
  return ''
}

function extractPriority(ticket: any): string {
  return 'Normal' // Default priority
}

function parseStatusHistory(ticket: any): any[] {
  // Parse status history from ticket data
  // This would need to be implemented based on RepairShopr API response structure
  return [{
    status: ticket.status,
    timestamp: ticket.timestamp,
    changed_by: 'system'
  }]
}

function parseComments(ticket: any): any[] {
  // Parse comments from ticket data
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
  
  // Check ticket description
  const description = (ticket.description || '').toLowerCase()
  for (const keyword of reworkKeywords) {
    if (description.includes(keyword)) {
      reworkCount++
      reworkReason = `Rework detected in description: ${keyword}`
      break
    }
  }
  
  // Check comments
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
  
  // Estimate active work time (this would be more accurate with detailed status history)
  const activeWorkTime = Math.floor(totalDuration * 0.3) // Assume 30% active work
  const waitingTime = Math.floor(totalDuration * 0.7) // Assume 70% waiting
  
  return { totalDuration, activeWorkTime, waitingTime }
}

function extractInternalNotes(ticket: any): any[] {
  return []
}

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

function extractPartsUsed(description: string): any[] {
  return []
}

function extractWorkCompleted(description: string): string {
  return description || ''
}

function extractTestingResults(description: string): string {
  return ''
}

function calculateQualityScore(ticket: any, reworkInfo: any): number {
  let score = 5.0 // Start with perfect score
  
  // Deduct for reworks
  if (reworkInfo.isRework) {
    score -= 2.0
  }
  
  // Deduct for multiple reworks
  if (reworkInfo.count > 1) {
    score -= 1.0
  }
  
  return Math.max(0, score)
}

function extractLaborCost(ticket: any): number {
  return 0
}

function extractPartsCost(ticket: any): number {
  return 0
}

function extractTotalCost(ticket: any): number {
  return 0
}

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
      business_hours_since_last_change: 0, // Would need to calculate
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

async function calculateSyncSummary(): Promise<any> {
  const { data: summary } = await supabaseAdmin
    .from('ticket_lifecycle')
    .select(`
      COUNT(*) as total_tickets,
      COUNT(CASE WHEN current_status = 'Completed' THEN 1 END) as completed_tickets,
      COUNT(CASE WHEN is_rework = true THEN 1 END) as rework_tickets,
      AVG(total_duration_seconds) as avg_duration_seconds,
      AVG(active_work_time_seconds) as avg_active_work_seconds
    `)
    .single()
  
  return summary
}
