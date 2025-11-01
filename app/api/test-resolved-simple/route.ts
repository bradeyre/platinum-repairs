import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token1 = process.env.REPAIRSHOPR_TOKEN
    const token2 = process.env.REPAIRSHOPR_TOKEN_DD
    
    console.log('🔍 Environment check:')
    console.log('REPAIRSHOPR_TOKEN:', token1 ? `${token1.substring(0, 10)}...` : 'Missing')
    console.log('REPAIRSHOPR_TOKEN_DD:', token2 ? `${token2.substring(0, 10)}...` : 'Missing')
    
    if (!token1 || !token2) {
      return NextResponse.json({ error: 'Tokens not found' }, { status: 500 })
    }
    
    // Test direct API call to get Resolved tickets
    const url = `https://platinumrepairs.repairshopr.com/api/v1/tickets?status=Resolved&page=1&limit=10&api_key=${token1}`
    console.log('🔍 Testing URL:', url)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('🔍 Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'API error', 
        status: response.status, 
        details: errorText 
      }, { status: 500 })
    }
    
    const data = await response.json()
    console.log('🔍 Response data:', {
      hasTickets: !!data.tickets,
      ticketCount: data.tickets?.length || 0,
      meta: data.meta,
      sampleTicket: data.tickets?.[0] ? {
        id: data.tickets[0].id,
        number: data.tickets[0].number,
        status: data.tickets[0].status,
        subject: data.tickets[0].subject?.substring(0, 50) + '...'
      } : null
    })
    
    return NextResponse.json({
      success: true,
      url,
      response: {
        status: response.status,
        ticketCount: data.tickets?.length || 0,
        meta: data.meta,
        sampleTicket: data.tickets?.[0] ? {
          id: data.tickets[0].id,
          number: data.tickets[0].number,
          status: data.tickets[0].status,
          subject: data.tickets[0].subject?.substring(0, 50) + '...'
        } : null
      }
    })
    
  } catch (error) {
    console.error('❌ Error in test:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


