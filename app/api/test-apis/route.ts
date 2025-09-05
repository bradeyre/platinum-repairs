import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🚀 Test APIs endpoint called')
    
    const prToken = process.env.REPAIRSHOPR_TOKEN
    const ddToken = process.env.REPAIRSHOPR_TOKEN_DD
    
    console.log('🔍 Environment check:')
    console.log('REPAIRSHOPR_TOKEN:', prToken ? 'Present' : 'Missing')
    console.log('REPAIRSHOPR_TOKEN_DD:', ddToken ? 'Present' : 'Missing')
    
    if (!prToken || !ddToken) {
      return NextResponse.json({ 
        error: 'Missing API tokens',
        prToken: prToken ? 'Present' : 'Missing',
        ddToken: ddToken ? 'Present' : 'Missing'
      }, { status: 500 })
    }
    
    // Test PR API
    console.log('🔍 Testing PR API...')
    const prResponse = await fetch('https://platinumrepairs.repairshopr.com/tickets', {
      headers: {
        'Authorization': `Bearer ${prToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`PR API response status: ${prResponse.status}`)
    
    let prData = null
    if (prResponse.ok) {
      prData = await prResponse.json()
      console.log(`PR API tickets count: ${prData.tickets ? prData.tickets.length : 'No tickets property'}`)
    } else {
      const errorText = await prResponse.text()
      console.error(`PR API error: ${prResponse.status} - ${errorText}`)
    }
    
    // Test DD API
    console.log('🔍 Testing DD API...')
    const ddResponse = await fetch('https://devic_doctorsa.repairshopr.com/tickets', {
      headers: {
        'Authorization': `Bearer ${ddToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`DD API response status: ${ddResponse.status}`)
    
    let ddData = null
    if (ddResponse.ok) {
      ddData = await ddResponse.json()
      console.log(`DD API tickets count: ${ddData.tickets ? ddData.tickets.length : 'No tickets property'}`)
    } else {
      const errorText = await ddResponse.text()
      console.error(`DD API error: ${ddResponse.status} - ${errorText}`)
    }
    
    // Analyze statuses
    const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress']
    
    let prStatuses = []
    let ddStatuses = []
    let prAllowedCount = 0
    let ddAllowedCount = 0
    
    if (prData?.tickets) {
      prStatuses = [...new Set(prData.tickets.map((t: any) => t.status))]
      prAllowedCount = prData.tickets.filter((t: any) => allowedStatuses.includes(t.status)).length
    }
    
    if (ddData?.tickets) {
      ddStatuses = [...new Set(ddData.tickets.map((t: any) => t.status))]
      ddAllowedCount = ddData.tickets.filter((t: any) => allowedStatuses.includes(t.status)).length
    }
    
    const result = {
      prApi: {
        status: prResponse.status,
        totalTickets: prData?.tickets?.length || 0,
        allowedTickets: prAllowedCount,
        allStatuses: prStatuses,
        allowedStatuses: prStatuses.filter(s => allowedStatuses.includes(s))
      },
      ddApi: {
        status: ddResponse.status,
        totalTickets: ddData?.tickets?.length || 0,
        allowedTickets: ddAllowedCount,
        allStatuses: ddStatuses,
        allowedStatuses: ddStatuses.filter(s => allowedStatuses.includes(s))
      },
      summary: {
        totalTickets: (prData?.tickets?.length || 0) + (ddData?.tickets?.length || 0),
        totalAllowedTickets: prAllowedCount + ddAllowedCount
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
