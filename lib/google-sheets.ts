import { google } from 'googleapis'
import { supabase } from './supabase'

// Google Sheets configuration
const SHEET_ID = '1YV4KkHsgQuGHPxU-x7By7mDRiRshj7cZ4ked4Sh7IvE'
const RANGE = 'Sheet1!A:Z'

// Initialize Google Sheets API
function getGoogleSheetsAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })
  
  return auth
}

export interface PartsPricing {
  part_name: string
  device_brand: string
  device_model: string
  price: number
  availability: string
}

export async function syncPartsFromGoogleSheets(): Promise<PartsPricing[]> {
  try {
    console.log('🔄 Starting Google Sheets sync...')
    
    const auth = getGoogleSheetsAuth()
    const sheets = google.sheets({ version: 'v4', auth })
    
    // Get all data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    })
    
    const rows = response.data.values || []
    console.log(`📊 Retrieved ${rows.length} rows from Google Sheets`)
    
    if (rows.length === 0) {
      console.log('⚠️ No data found in Google Sheets')
      return []
    }
    
    const partsData: PartsPricing[] = []
    
    // Parse the sheet structure: Brand headers, then models, then parts with pricing
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      
      // Look for brand headers (like "iPhone")
      if (row[0] && !row[1] && row[0].toLowerCase().includes('phone')) {
        const brand = row[0]
        console.log(`📱 Processing brand: ${brand}`)
        
        // Look ahead for model rows and part pricing
        let modelRowIndex = rowIndex + 1
        while (modelRowIndex < rows.length && rows[modelRowIndex][0]) {
          const modelRow = rows[modelRowIndex]
          const model = modelRow[0]
          
          // Find parts in subsequent columns (Screen, Battery, etc.)
          for (let colIndex = 1; colIndex < modelRow.length; colIndex++) {
            const partData = modelRow[colIndex]
            if (partData && partData.includes('R')) { // Contains price with 'R' prefix
              // Extract part name from header row
              const headerRow = rows[0] // Assuming first row has part names
              const partName = headerRow[colIndex] || `Part ${colIndex}`
              
              // Extract price (remove 'R' and parse)
              const price = parseFloat(partData.replace('R', '').replace(',', '') || '0')
              
              if (price > 0) {
                partsData.push({
                  part_name: partName,
                  device_brand: brand,
                  device_model: model,
                  price: price,
                  availability: 'Available' // Default availability
                })
              }
            }
          }
          modelRowIndex++
        }
      }
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
  return selectedParts.reduce((total, part) => total + part.price, 0)
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
