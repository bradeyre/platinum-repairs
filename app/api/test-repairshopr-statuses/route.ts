import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token1 = process.env.REPAIRSHOPR_TOKEN
    const token2 = process.env.REPAIRSHOPR_TOKEN_DD
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Tokens not found' }, { status: 500 })
    }
    
    // Test different status names that might exist in RepairShopr
    const testStatuses = [
      'Resolved',
      'Closed File', 
      'Salvage',
      'BER',
      'Completed',
      'Closed',
      'Finished',
      'Done'
    ]
    
    const results = []
    
    for (const status of testStatuses) {
      try {
        // Test Platinum Repairs API
        const prResponse = await fetch(`https://api.repairshopr.com/v1/tickets?status=${encodeURIComponent(status)}&limit=5`, {
          headers: {
            'Authorization': `Bearer ${token1}`,
            'Content-Type': 'application/json'
          }
        })
        
        const prData = await prResponse.json()
        
        // Test Device Doctor API
        const ddResponse = await fetch(`https://api.repairshopr.com/v1/tickets?status=${encodeURIComponent(status)}&limit=5`, {
          headers: {
            'Authorization': `Bearer ${token2}`,
            'Content-Type': 'application/json'
          }
        })
        
        const ddData = await ddResponse.json()
        
        results.push({
          status,
          prCount: prData.tickets?.length || 0,
          ddCount: ddData.tickets?.length || 0,
          prError: prData.error || null,
          ddError: ddData.error || null
        })
        
      } catch (error) {
        results.push({
          status,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


