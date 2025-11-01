import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params
    const { reason } = await request.json()

    const { data: report, error } = await supabaseAdmin
      .from('damage_reports')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      console.error('Error rejecting damage report:', error)
      return NextResponse.json(
        { error: 'Failed to reject damage report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      report,
      message: 'Damage report rejected and returned to technician'
    })
  } catch (error) {
    console.error('Error rejecting damage report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
