import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Test PDF: Starting test...')
    
    // Test basic Supabase connection
    const { data: reports, error } = await supabaseAdmin
      .from('damage_reports')
      .select('id, dr_number, device_brand, device_model, status')
      .limit(1)
    
    console.log('Test PDF: Supabase test result:', { reports, error })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: error.message
      }, { status: 500 })
    }
    
    if (!reports || reports.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No damage reports found',
        reports: []
      }, { status: 404 })
    }
    
    const testReport = reports[0]
    console.log('Test PDF: Found test report:', testReport)
    
    return NextResponse.json({
      success: true,
      message: 'PDF generation test successful',
      testReport,
      totalReports: reports.length
    })
    
  } catch (error) {
    console.error('Test PDF: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
