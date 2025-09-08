import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test database connection
    const { data, error } = await supabase
      .from('parts_pricing')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      }, { status: 500 })
    }
    
    console.log('✅ Database connection successful')
    
    // Test CSV fetch
    const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    
    console.log('🔍 Testing CSV fetch...')
    const response = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlatinumRepairs/1.0)'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'CSV fetch failed',
        details: `${response.status} ${response.statusText}`
      }, { status: 500 })
    }
    
    const csvText = await response.text()
    console.log('✅ CSV fetch successful, length:', csvText.length)
    
    // Test CSV parsing
    const lines = csvText.split('\n')
    console.log('✅ CSV parsing successful, rows:', lines.length)
    
    // Test price parsing
    const testPrice = 'R1,499.00'
    const cleanPrice = testPrice.replace(/R/g, '').replace(/,/g, '').trim()
    const price = parseFloat(cleanPrice)
    console.log('✅ Price parsing test:', { testPrice, cleanPrice, price })
    
    return NextResponse.json({
      success: true,
      tests: {
        database: 'Connected',
        csvFetch: 'Success',
        csvLength: csvText.length,
        csvRows: lines.length,
        priceParsing: { testPrice, cleanPrice, price }
      }
    })
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
