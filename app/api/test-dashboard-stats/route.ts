import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Test Dashboard Stats: Starting...')
    
    // Test basic functionality
    const today = new Date().toISOString().split('T')[0]
    console.log('🔧 Test Dashboard Stats: Today is', today)
    
    // Test RepairShopr tokens
    const prToken = process.env.REPAIRSHOPR_TOKEN
    const ddToken = process.env.REPAIRSHOPR_TOKEN_DD
    
    console.log('🔧 Test Dashboard Stats: PR Token exists:', !!prToken)
    console.log('🔧 Test Dashboard Stats: DD Token exists:', !!ddToken)
    
    if (!prToken || !ddToken) {
      return NextResponse.json({
        error: 'RepairShopr tokens not configured',
        prToken: !!prToken,
        ddToken: !!ddToken
      })
    }
    
    // Test basic RepairShopr API call
    try {
      const testResponse = await fetch(`https://platinumrepairs.repairshopr.com/api/v1/tickets?limit=5&api_key=${prToken}`)
      console.log('🔧 Test Dashboard Stats: PR API response status:', testResponse.status)
      
      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log('🔧 Test Dashboard Stats: PR API returned', testData.tickets?.length || 0, 'tickets')
      }
    } catch (apiError) {
      console.error('🔧 Test Dashboard Stats: PR API error:', apiError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test completed successfully',
      today,
      prToken: !!prToken,
      ddToken: !!ddToken,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test Dashboard Stats Error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
