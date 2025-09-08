import { NextRequest, NextResponse } from 'next/server'
import { getPartsPricing, searchParts, getUniqueBrands, getModelsForBrand } from '@/lib/google-sheets'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceBrand = searchParams.get('brand')
    const deviceModel = searchParams.get('model')
    const search = searchParams.get('search')
    const action = searchParams.get('action')
    
    // Handle different actions
    if (action === 'brands') {
      const brands = await getUniqueBrands()
      return NextResponse.json({ success: true, brands })
    }
    
    if (action === 'models' && deviceBrand) {
      const models = await getModelsForBrand(deviceBrand)
      return NextResponse.json({ success: true, models })
    }
    
    // Search functionality
    if (search) {
      const parts = await searchParts(search)
      return NextResponse.json({ success: true, parts })
    }
    
    // Get parts with optional filtering
    const parts = await getPartsPricing(deviceBrand || undefined, deviceModel || undefined)
    
    return NextResponse.json({
      success: true,
      parts,
      count: parts.length,
      filters: {
        brand: deviceBrand,
        model: deviceModel
      }
    })
  } catch (error) {
    console.error('❌ Error in parts pricing API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch parts pricing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
