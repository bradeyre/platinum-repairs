import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('Complete API: Received request for ID:', id)
    console.log('Complete API: Request body:', body)
    
    const { status } = body

    // First, check if the damage report exists
    const { data: existingReport, error: fetchError } = await supabaseAdmin
      .from('damage_reports')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Complete API: Error fetching existing report:', fetchError)
      return NextResponse.json(
        { error: 'Damage report not found', details: fetchError.message },
        { status: 404 }
      )
    }

    console.log('Complete API: Found existing report:', existingReport)

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
      console.error('Complete API: Error updating report:', error)
      return NextResponse.json(
        { error: 'Failed to mark report as completed', details: error.message },
        { status: 500 }
      )
    }

    console.log('Complete API: Successfully updated report:', data)

    return NextResponse.json({ 
      success: true, 
      report: data,
      message: 'Damage report marked as completed'
    })
  } catch (error) {
    console.error('Complete API: Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
