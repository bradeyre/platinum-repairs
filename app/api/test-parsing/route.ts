import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test the CSV parsing directly
    const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    
    console.log('🔍 Fetching CSV data...')
    const response = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlatinumRepairs/1.0)'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch: ${response.status} ${response.statusText}`
      }, { status: 500 })
    }
    
    const csvText = await response.text()
    console.log('✅ CSV fetched, length:', csvText.length)
    
    // Parse CSV manually
    const lines = csvText.split('\n')
    console.log('📊 Total lines:', lines.length)
    
    const partsData: any[] = []
    
    for (let rowIndex = 1; rowIndex < Math.min(lines.length, 10); rowIndex++) { // Test first 10 rows
      const line = lines[rowIndex].trim()
      if (!line) continue
      
      console.log(`🔍 Processing line ${rowIndex}:`, line.substring(0, 100) + '...')
      
      // Simple CSV parsing
      const row = parseCSVLine(line)
      console.log(`📋 Parsed row ${rowIndex}:`, row.slice(0, 5)) // First 5 columns
      
      if (!row[0] || !row[1]) continue
      
      const deviceModel = row[0].trim()
      const partName = row[1].trim()
      
      if (!partName || partName === deviceModel || partName === 'iPhone') continue
      
      // Parse insurance price
      const insurancePrice = parsePrice(row[3])
      console.log(`💰 Insurance price for ${partName}:`, insurancePrice)
      
      if (insurancePrice === 0) continue
      
      partsData.push({
        deviceModel,
        partName,
        insurancePrice,
        etaInfo: row[5] || 'Next day',
        replacementValue: parsePrice(row[12])
      })
    }
    
    return NextResponse.json({
      success: true,
      csvLength: csvText.length,
      totalLines: lines.length,
      partsFound: partsData.length,
      sampleParts: partsData.slice(0, 5),
      firstFewLines: lines.slice(0, 5)
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

// Helper function to parse a single CSV line
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Helper function to parse price strings
function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  
  // Remove R prefix, commas, and parse
  const cleanPrice = priceStr.replace(/R/g, '').replace(/,/g, '').trim()
  const price = parseFloat(cleanPrice)
  
  return isNaN(price) ? 0 : price
}
