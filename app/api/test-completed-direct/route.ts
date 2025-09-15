import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token1 = process.env.REPAIRSHOPR_TOKEN
    const token2 = process.env.REPAIRSHOPR_TOKEN_DD
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Tokens not found' }, { status: 500 })
    }
    
    // Test direct API calls to both RepairShopr instances
    const results = []
    
    // Test Platinum Repairs API
    try {
      const prResponse = await fetch('https://platinumrepairs.repairshopr.com/api/v1/tickets?status=Completed&limit=10', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token1}`
        }
      })
      
      const prData = await prResponse.json()
      results.push({
        api: 'Platinum Repairs',
        status: prResponse.status,
        ticketCount: prData.tickets?.length || 0,
        error: prData.error || null,
        sampleTickets: prData.tickets?.slice(0, 2) || []
      })
    } catch (error) {
      results.push({
        api: 'Platinum Repairs',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    
    // Test Device Doctor API
    try {
      const ddResponse = await fetch('https://devicedoctorsa.repairshopr.com/api/v1/tickets?status=Completed&limit=10', {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token2}`
        }
      })
      
      const ddData = await ddResponse.json()
      results.push({
        api: 'Device Doctor',
        status: ddResponse.status,
        ticketCount: ddData.tickets?.length || 0,
        error: ddData.error || null,
        sampleTickets: ddData.tickets?.slice(0, 2) || []
      })
    } catch (error) {
      results.push({
        api: 'Device Doctor',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
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


