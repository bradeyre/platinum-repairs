import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('Manager decision API received data:', body)
    console.log('Selected parts received:', body.selectedParts)
    
    const {
      decision,
      berDecision,
      berReason,
      finalTotalCost,
      managerNotes,
      selectedParts,
      customParts,
      finalETA
    } = body

    // Update the damage report with manager decision
    const { data, error } = await supabaseAdmin
      .from('damage_reports')
      .update({
        manager_ber_decision: berDecision,
        ber_reason: berReason,
        manager_notes: managerNotes,
        selected_parts: {
          selectedParts: selectedParts || [],
          customParts: customParts || []
        },
        total_parts_cost: finalTotalCost || 0,
        final_eta_days: finalETA || 1,
        status: decision === 'approve' ? 'in_repair' : decision === 'ber' ? 'ber_confirmed' : 'awaiting_approval',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating manager decision:', error)
      return NextResponse.json(
        { error: 'Failed to update manager decision' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      report: data,
      message: `Damage report ${decision === 'approve' ? 'approved for repair' : decision === 'ber' ? 'marked as BER' : 'updated'}`
    })
  } catch (error) {
    console.error('Error updating manager decision:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
