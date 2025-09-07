import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN
    const ddToken = process.env.REPAIRSHOPR_TOKEN_DD
    
    if (!token || !ddToken) {
      return NextResponse.json({ 
        error: 'Missing API tokens',
        hasToken: !!token,
        hasDDToken: !!ddToken
      }, { status: 500 })
    }

    // Test Device Doctor API with api_key query parameter (based on Zapier example)
    console.log('🔍 Testing Device Doctor API with api_key query parameter...')
    const ddResponse = await fetch(`https://devicedoctorsa.repairshopr.com/api/v1/tickets?api_key=${ddToken}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Device Doctor API status: ${ddResponse.status}`)
    
    let ddData = null
    if (ddResponse.ok) {
      ddData = await ddResponse.json()
    } else {
      const errorText = await ddResponse.text()
      console.error(`Device Doctor API error: ${ddResponse.status} - ${errorText}`)
    }
    
    // Test Platinum Repairs API with api_key query parameter
    console.log('🔍 Testing Platinum Repairs API with api_key query parameter...')
    const prResponse = await fetch(`https://platinumrepairs.repairshopr.com/api/v1/tickets?api_key=${token}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Platinum Repairs API status: ${prResponse.status}`)
    
    let prData = null
    if (prResponse.ok) {
      prData = await prResponse.json()
    } else {
      const errorText = await prResponse.text()
      console.error(`Platinum Repairs API error: ${prResponse.status} - ${errorText}`)
    }
    
    return NextResponse.json({
      success: true,
      deviceDoctorApi: {
        status: ddResponse.status,
        success: ddResponse.ok,
        ticketCount: ddData?.tickets?.length || 0,
        sampleTicket: ddData?.tickets?.[0] ? {
          id: ddData.tickets[0].id,
          number: ddData.tickets[0].number,
          status: ddData.tickets[0].status,
          subject: ddData.tickets[0].subject?.substring(0, 100) + '...'
        } : null
      },
      platinumRepairsApi: {
        status: prResponse.status,
        success: prResponse.ok,
        ticketCount: prData?.tickets?.length || 0,
        sampleTicket: prData?.tickets?.[0] ? {
          id: prData.tickets[0].id,
          number: prData.tickets[0].number,
          status: prData.tickets[0].status,
          subject: prData.tickets[0].subject?.substring(0, 100) + '...'
        } : null
      }
    })
    
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
