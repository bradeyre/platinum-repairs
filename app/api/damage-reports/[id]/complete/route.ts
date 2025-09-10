import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { status } = body

    // Update the damage report status to completed
    const { data, error } = await supabaseAdmin
      .from('damage_reports')
      .update({
        status: status || 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error marking report as completed:', error)
      return NextResponse.json(
        { error: 'Failed to mark report as completed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      report: data,
      message: 'Damage report marked as completed'
    })
  } catch (error) {
    console.error('Error in complete API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
