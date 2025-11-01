import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    
    console.log('🔍 Testing Google Sheets CSV export...')
    console.log('📋 CSV URL:', csvUrl)
    
    const response = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlatinumRepairs/1.0)'
      }
    })
    
    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('📄 Response text (first 500 chars):', responseText.substring(0, 500))
    
    // Check if we got HTML instead of CSV
    const isHtml = responseText.trim().startsWith('<HTML>') || responseText.trim().startsWith('<!DOCTYPE')
    
    return NextResponse.json({
      success: true,
      test: {
        url: csvUrl,
        status: response.status,
        statusText: response.statusText,
        isHtml: isHtml,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 500),
        headers: Object.fromEntries(response.headers.entries())
      }
    })
  } catch (error) {
    console.error('❌ Error testing Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
