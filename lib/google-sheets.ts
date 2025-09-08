import { supabase } from './supabase'

// Google Sheets configuration
const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
const RANGE = 'Sheet1!A:M' // Only need columns A through M based on screenshot

// Function to fetch data from public Google Sheets
async function fetchGoogleSheetsData() {
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
    const rows = await fetchGoogleSheetsData()
    console.log(`📊 Retrieved ${rows.length} rows from Google Sheets`)
    
    if (rows.length === 0) {
      console.log('⚠️ No data found in Google Sheets')
      return []
    }
    
    const partsData: PartsPricing[] = []
    
    // Parse the sheet structure based on actual CSV data:
    // Column A: iPhone model names
    // Column B: Repair part names  
    // Column D: Insurance prices (R1,499.00 format)
    // Column F: ETA information (Next day, etc.)
    // Column G: Retail 1 Year prices
    // Column H: Retail 2 Year prices
    // Column I: Retail Lifetime prices
    // Column M: Replacement Value
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) { // Skip header row
      const row = rows[rowIndex]
      
      // Skip empty rows or rows without model name
      if (!row[0] || !row[1]) continue
      
      const deviceModel = row[0].trim()
      const partName = row[1].trim()
      
      // Skip if this looks like a category header (no part name or same as model)
      if (!partName || partName === deviceModel || partName === 'iPhone') continue
      
      // Extract device brand from model name
      let deviceBrand = 'iPhone' // Default to iPhone
      if (deviceModel.toLowerCase().includes('samsung')) {
        deviceBrand = 'Samsung'
      } else if (deviceModel.toLowerCase().includes('huawei')) {
        deviceBrand = 'Huawei'
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
        device_type: 'phone',
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
    
    console.log(`✅ Parsed ${partsData.length} parts from Google Sheets`)
    
    // Store in Supabase
    if (partsData.length > 0) {
      const { error } = await supabase
        .from('parts_pricing')
        .upsert(partsData, { onConflict: 'part_name,device_brand,device_model' })
      
      if (error) {
        console.error('❌ Error storing parts data:', error)
        throw error
      }
      
      console.log('✅ Successfully synced parts data to database')
    }
    
    return partsData
  } catch (error) {
    console.error('❌ Error syncing from Google Sheets:', error)
    throw error
  }
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
    let query = supabase
      .from('parts_pricing')
      .select('*')
      .order('device_brand', { ascending: true })
      .order('device_model', { ascending: true })
      .order('part_name', { ascending: true })
    
    if (deviceBrand) {
      query = query.eq('device_brand', deviceBrand)
    }
    
    if (deviceModel) {
      query = query.eq('device_model', deviceModel)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching parts pricing:', error)
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error getting parts pricing:', error)
    throw error
  }
}

export async function searchParts(searchTerm: string): Promise<PartsPricing[]> {
  try {
    const { data, error } = await supabase
      .from('parts_pricing')
      .select('*')
      .or(`part_name.ilike.%${searchTerm}%,device_brand.ilike.%${searchTerm}%,device_model.ilike.%${searchTerm}%`)
      .order('device_brand', { ascending: true })
      .order('device_model', { ascending: true })
      .order('part_name', { ascending: true })
    
    if (error) {
      console.error('Error searching parts:', error)
      throw error
    }
    
    return data || []
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
    const { data, error } = await supabase
      .from('parts_pricing')
      .select('device_brand')
      .order('device_brand', { ascending: true })
    
    if (error) {
      console.error('Error fetching brands:', error)
      throw error
    }
    
    const brands = [...new Set(data?.map(item => item.device_brand) || [])]
    return brands
  } catch (error) {
    console.error('Error getting unique brands:', error)
    throw error
  }
}

// Helper function to get models for a specific brand
export async function getModelsForBrand(brand: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('parts_pricing')
      .select('device_model')
      .eq('device_brand', brand)
      .order('device_model', { ascending: true })
    
    if (error) {
      console.error('Error fetching models:', error)
      throw error
    }
    
    const models = [...new Set(data?.map(item => item.device_model) || [])]
    return models
  } catch (error) {
    console.error('Error getting models for brand:', error)
    throw error
  }
}
