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

    // Test 1: Try Bearer token authentication
    console.log('🔍 Testing Bearer token authentication...')
    const bearerResponse = await fetch('https://platinumrepairs.repairshopr.com/api/v1/tickets', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Bearer auth status: ${bearerResponse.status}`)
    
    // Test 2: Try api_key query parameter
    console.log('🔍 Testing api_key query parameter...')
    const queryResponse = await fetch(`https://platinumrepairs.repairshopr.com/api/v1/tickets?api_key=${token}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Query param auth status: ${queryResponse.status}`)
    
    // Test 3: Try X-API-Key header
    console.log('🔍 Testing X-API-Key header...')
    const headerResponse = await fetch('https://platinumrepairs.repairshopr.com/api/v1/tickets', {
      headers: {
        'X-API-Key': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`X-API-Key header status: ${headerResponse.status}`)
    
    // Test Device Doctor API with the working method
    console.log('🔍 Testing Device Doctor API...')
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
    }
    
    return NextResponse.json({
      success: true,
      authenticationTests: {
        bearerToken: {
          status: bearerResponse.status,
          success: bearerResponse.ok
        },
        queryParameter: {
          status: queryResponse.status,
          success: queryResponse.ok
        },
        xApiKeyHeader: {
          status: headerResponse.status,
          success: headerResponse.ok
        }
      },
      deviceDoctorApi: {
        status: ddResponse.status,
        success: ddResponse.ok,
        ticketCount: ddData?.tickets?.length || 0,
        sampleTicket: ddData?.tickets?.[0] || null
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
