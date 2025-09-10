import { supabase } from './supabase'

// Google Sheets configuration
const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
const RANGE = 'Sheet1!A:M' // Only need columns A through M based on screenshot

// Function to fetch raw CSV data from public Google Sheets
async function fetchGoogleSheetsCSV(): Promise<string> {
  try {
    // Use the public CSV export URL for the sheet
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`
    
    const response = await fetch(csvUrl, {
      redirect: 'follow', // Follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlatinumRepairs/1.0)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets data: ${response.status} ${response.statusText}`)
    }
    
    const csvText = await response.text()
    
    // Check if we got HTML instead of CSV (indicates access issue)
    if (csvText.trim().startsWith('<HTML>') || csvText.trim().startsWith('<!DOCTYPE')) {
      throw new Error('Google Sheets is not publicly accessible. Please ensure the sheet is set to "Anyone with the link can view"')
    }
    
    return csvText
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    throw error
  }
}

// Function to fetch data from public Google Sheets (returns parsed rows)
async function fetchGoogleSheetsData() {
  try {
    const csvText = await fetchGoogleSheetsCSV()
    return parseCSVData(csvText)
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error)
    throw error
  }
}

// Parse CSV data into structured format
function parseCSVData(csvText: string): any[][] {
  const lines = csvText.split('\n')
  const rows: any[][] = []
  
  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing (handles quoted fields)
      const row = parseCSVLine(line)
      rows.push(row)
    }
  }
  
  return rows
}

// Simple CSV line parser
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

export interface PartsPricing {
  part_number: string
  part_name: string
  device_brand: string
  device_model: string
  device_type: string
  insurance_price: number
  eta_info: string
  retail_1_year: number | null
  retail_2_year: number | null
  retail_lifetime: number | null
  replacement_value: number | null
  stock_status: string
  sheet_row_number: number
  last_synced: string
}

export async function syncPartsFromGoogleSheets(): Promise<PartsPricing[]> {
  try {
    console.log('🔄 Starting Google Sheets sync...')
    
    // Fetch data from public Google Sheets
    const csvText = await fetchGoogleSheetsCSV()
    console.log(`📊 Retrieved CSV data, length: ${csvText.length}`)
    
    if (!csvText.trim()) {
      console.log('⚠️ No data found in Google Sheets')
      return []
    }
    
    // Parse the CSV data using the shared parsing function
    const partsData = parseCSVToPartsPricing(csvText)
    
    console.log(`✅ Parsed ${partsData.length} parts from Google Sheets`)
    console.log('✅ Live data fetched directly from Google Sheets - no database storage needed')
    
    return partsData
  } catch (error) {
    console.error('❌ Error syncing from Google Sheets:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

// Helper function to parse CSV data into PartsPricing objects
function parseCSVToPartsPricing(csvText: string): PartsPricing[] {
  const lines = csvText.split('\n')
  const partsData: PartsPricing[] = []
  
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) { // Skip header row
    const line = lines[rowIndex].trim()
    if (!line) continue
    
    const row = parseCSVLine(line)
    
    // Skip empty rows or rows without model name
    if (!row[0] || !row[1]) continue
    
    const deviceModel = row[0].trim()
    const partName = row[1].trim()
    
    // Skip if this looks like a category header (no part name or same as model)
    if (!partName || partName === deviceModel || partName === 'iPhone') continue
    
    // Extract device brand from model name
    let deviceBrand = 'Unknown'
    let deviceType = 'phone'
    
    // Parse brand from model name
    if (deviceModel.toLowerCase().includes('iphone')) {
      deviceBrand = 'iPhone'
      deviceType = 'phone'
    } else if (deviceModel.toLowerCase().includes('samsung')) {
      deviceBrand = 'Samsung'
      deviceType = 'phone'
    } else if (deviceModel.toLowerCase().includes('huawei')) {
      deviceBrand = 'Huawei'
      deviceType = 'phone'
    } else if (deviceModel.toLowerCase().includes('galaxy')) {
      deviceBrand = 'Samsung'
      deviceType = 'phone'
    } else if (deviceModel.toLowerCase().includes('find x') || deviceModel.toLowerCase().includes('reno')) {
      deviceBrand = 'Oppo'
      deviceType = 'phone'
    } else if (deviceModel.toLowerCase().includes('macbook') || deviceModel.toLowerCase().includes('imac')) {
      deviceBrand = 'Apple'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('hp') || deviceModel.toLowerCase().includes('pavilion') || deviceModel.toLowerCase().includes('elitebook')) {
      deviceBrand = 'HP'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('dell') || deviceModel.toLowerCase().includes('inspiron') || deviceModel.toLowerCase().includes('latitude')) {
      deviceBrand = 'Dell'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('lenovo') || deviceModel.toLowerCase().includes('thinkpad') || deviceModel.toLowerCase().includes('ideapad')) {
      deviceBrand = 'Lenovo'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('asus') || deviceModel.toLowerCase().includes('zenbook') || deviceModel.toLowerCase().includes('vivobook')) {
      deviceBrand = 'ASUS'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('acer') || deviceModel.toLowerCase().includes('aspire') || deviceModel.toLowerCase().includes('swift')) {
      deviceBrand = 'Acer'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('surface')) {
      deviceBrand = 'Microsoft'
      deviceType = 'laptop'
    } else if (deviceModel.toLowerCase().includes('ipad')) {
      deviceBrand = 'Apple'
      deviceType = 'tablet'
    } else if (deviceModel.toLowerCase().includes('watch')) {
      deviceBrand = 'Apple'
      deviceType = 'watch'
    } else {
      // Try to extract brand from the beginning of the model name
      const words = deviceModel.split(' ')
      if (words.length > 0) {
        const firstWord = words[0].toLowerCase()
        if (firstWord === 'iphone' || firstWord === 'samsung' || firstWord === 'huawei' || 
            firstWord === 'galaxy' || firstWord === 'macbook' || firstWord === 'imac' ||
            firstWord === 'hp' || firstWord === 'dell' || firstWord === 'lenovo' ||
            firstWord === 'asus' || firstWord === 'acer' || firstWord === 'surface' ||
            firstWord === 'ipad' || firstWord === 'watch') {
          deviceBrand = words[0].charAt(0).toUpperCase() + words[0].slice(1)
        }
      }
    }
    
    // Parse insurance price (Column D - index 3)
    const insurancePrice = parsePrice(row[3])
    
    // Skip if no insurance price
    if (insurancePrice === 0) continue
    
    // Parse ETA info (Column F - index 5)
    const etaInfo = row[5] || 'Next day'
    
    // Parse retail prices (Columns G, H, I - indices 6, 7, 8)
    const retail1Year = parsePrice(row[6])
    const retail2Year = parsePrice(row[7])
    const retailLifetime = parsePrice(row[8])
    
    // Parse replacement value (Column M - index 12)
    const replacementValue = parsePrice(row[12])
    
    // Determine stock status based on ETA
    let stockStatus = 'available'
    if (etaInfo.toLowerCase().includes('while stock lasts')) {
      stockStatus = 'limited'
    } else if (etaInfo.toLowerCase().includes('weeks')) {
      stockStatus = 'backorder'
    }
    
    partsData.push({
      part_number: `${deviceBrand}-${deviceModel}-${partName}`.replace(/\s+/g, '-').toLowerCase(),
      part_name: partName,
      device_brand: deviceBrand,
      device_model: deviceModel,
      device_type: deviceType,
      insurance_price: insurancePrice,
      eta_info: etaInfo,
      retail_1_year: retail1Year || null,
      retail_2_year: retail2Year || null,
      retail_lifetime: retailLifetime || null,
      replacement_value: replacementValue || null,
      stock_status: stockStatus,
      sheet_row_number: rowIndex + 1,
      last_synced: new Date().toISOString()
    })
  }
  
  return partsData
}


// Helper function to parse price strings
function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  
  // Remove R prefix, commas, and parse
  const cleanPrice = priceStr.replace(/R/g, '').replace(/,/g, '').trim()
  const price = parseFloat(cleanPrice)
  
  return isNaN(price) ? 0 : price
}

export async function getPartsPricing(deviceBrand?: string, deviceModel?: string): Promise<PartsPricing[]> {
  try {
    const csvText = await fetchGoogleSheetsCSV()
    const partsData = parseCSVToPartsPricing(csvText)
    
    let filteredParts = partsData
    
    if (deviceBrand) {
      filteredParts = filteredParts.filter(part => part.device_brand === deviceBrand)
    }
    
    if (deviceModel) {
      filteredParts = filteredParts.filter(part => part.device_model === deviceModel)
    }
    
    return filteredParts.sort((a, b) => {
      if (a.device_brand !== b.device_brand) return a.device_brand.localeCompare(b.device_brand)
      if (a.device_model !== b.device_model) return a.device_model.localeCompare(b.device_model)
      return a.part_name.localeCompare(b.part_name)
    })
  } catch (error) {
    console.error('Error getting parts pricing:', error)
    throw error
  }
}

export async function searchParts(searchTerm: string): Promise<PartsPricing[]> {
  try {
    const csvText = await fetchGoogleSheetsCSV()
    const partsData = parseCSVToPartsPricing(csvText)
    
    const searchLower = searchTerm.toLowerCase()
    const filteredParts = partsData.filter(part => 
      part.part_name.toLowerCase().includes(searchLower) ||
      part.device_brand.toLowerCase().includes(searchLower) ||
      part.device_model.toLowerCase().includes(searchLower)
    )
    
    return filteredParts.sort((a, b) => {
      if (a.device_brand !== b.device_brand) return a.device_brand.localeCompare(b.device_brand)
      if (a.device_model !== b.device_model) return a.device_model.localeCompare(b.device_model)
      return a.part_name.localeCompare(b.part_name)
    })
  } catch (error) {
    console.error('Error searching parts:', error)
    throw error
  }
}

// Helper function to calculate total parts cost
export function calculatePartsCost(selectedParts: PartsPricing[]): number {
  return selectedParts.reduce((total, part) => total + part.insurance_price, 0)
}

// Helper function to get unique brands
export async function getUniqueBrands(): Promise<string[]> {
  try {
    const csvText = await fetchGoogleSheetsCSV()
    const partsData = parseCSVToPartsPricing(csvText)
    
    const brands = [...new Set(partsData.map(item => item.device_brand))]
    return brands.sort()
  } catch (error) {
    console.error('Error getting unique brands:', error)
    throw error
  }
}

// Helper function to get models for a specific brand
export async function getModelsForBrand(brand: string): Promise<string[]> {
  try {
    const csvText = await fetchGoogleSheetsCSV()
    const partsData = parseCSVToPartsPricing(csvText)
    
    const models = [...new Set(
      partsData
        .filter(item => item.device_brand === brand)
        .map(item => item.device_model)
    )]
    return models.sort()
  } catch (error) {
    console.error('Error getting models for brand:', error)
    throw error
  }
}
