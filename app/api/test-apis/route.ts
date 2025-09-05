import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🚀 Test APIs endpoint called')
    
    const prToken = process.env.REPAIRSHOPR_TOKEN
    const ddToken = process.env.REPAIRSHOPR_TOKEN_DD
    
    console.log('🔍 Environment check:')
    console.log('REPAIRSHOPR_TOKEN:', prToken ? 'Present' : 'Missing')
    console.log('REPAIRSHOPR_TOKEN_DD:', ddToken ? 'Present' : 'Missing')
    
    const result = {
      environment: {
        prToken: prToken ? 'Present' : 'Missing',
        ddToken: ddToken ? 'Present' : 'Missing'
      },
      prApi: { status: 'Not tested', totalTickets: 0, error: null as string | null },
      ddApi: { status: 'Not tested', totalTickets: 0, error: null as string | null }
    }
    
    if (!prToken || !ddToken) {
      return NextResponse.json({ 
        error: 'Missing API tokens',
        ...result
      }, { status: 500 })
    }
    
    // Test PR API
    try {
      console.log('🔍 Testing PR API...')
      const prResponse = await fetch('https://platinumrepairs.repairshopr.com/tickets', {
        headers: {
          'Authorization': `Bearer ${prToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      console.log(`PR API response status: ${prResponse.status}`)
      
      if (prResponse.ok) {
        const prData = await prResponse.json()
        console.log(`PR API tickets count: ${prData.tickets ? prData.tickets.length : 'No tickets property'}`)
        result.prApi = {
          status: prResponse.status.toString(),
          totalTickets: prData.tickets?.length || 0,
          error: null
        }
      } else {
        const errorText = await prResponse.text()
        console.error(`PR API error: ${prResponse.status} - ${errorText}`)
        result.prApi = {
          status: prResponse.status.toString(),
          totalTickets: 0,
          error: errorText
        }
      }
    } catch (error) {
      console.error('PR API test failed:', error)
      result.prApi = {
        status: 'Error',
        totalTickets: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Test DD API
    try {
      console.log('🔍 Testing DD API...')
      const ddResponse = await fetch('https://devic_doctorsa.repairshopr.com/tickets', {
        headers: {
          'Authorization': `Bearer ${ddToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      console.log(`DD API response status: ${ddResponse.status}`)
      
      if (ddResponse.ok) {
        const ddData = await ddResponse.json()
        console.log(`DD API tickets count: ${ddData.tickets ? ddData.tickets.length : 'No tickets property'}`)
        result.ddApi = {
          status: ddResponse.status.toString(),
          totalTickets: ddData.tickets?.length || 0,
          error: null
        }
      } else {
        const errorText = await ddResponse.text()
        console.error(`DD API error: ${ddResponse.status} - ${errorText}`)
        result.ddApi = {
          status: ddResponse.status.toString(),
          totalTickets: 0,
          error: errorText
        }
      }
    } catch (error) {
      console.error('DD API test failed:', error)
      result.ddApi = {
        status: 'Error',
        totalTickets: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    console.log('📊 Test results:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Test APIs error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
