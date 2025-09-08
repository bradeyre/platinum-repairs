import { NextRequest, NextResponse } from 'next/server'
import { syncPartsFromGoogleSheets } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Google Sheets sync via API...')
    
    const partsData = await syncPartsFromGoogleSheets()
    
    return NextResponse.json({
      success: true,
      message: 'Google Sheets sync completed successfully',
      partsCount: partsData.length,
      parts: partsData.slice(0, 10) // Return first 10 parts as sample
    })
  } catch (error) {
    console.error('❌ Error in Google Sheets sync API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync Google Sheets data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting Google Sheets sync status...')
    
    // This could be used to check sync status or get last sync time
    return NextResponse.json({
      success: true,
      message: 'Google Sheets sync endpoint is available',
      lastSync: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error in Google Sheets status API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
