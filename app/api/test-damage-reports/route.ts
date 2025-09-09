import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing damage_reports table...')
    
    // First, let's check if the table exists by trying to select from it
    const { data: reports, error } = await supabaseAdmin
      .from('damage_reports')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error accessing damage_reports table:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    console.log(`✅ Successfully accessed damage_reports table. Found ${reports?.length || 0} records`)
    
    return NextResponse.json({
      success: true,
      message: 'damage_reports table exists and is accessible',
      recordCount: reports?.length || 0,
      sampleData: reports?.[0] || null
    })
  } catch (error) {
    console.error('❌ Exception accessing damage_reports table:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'exception'
    })
  }
}
