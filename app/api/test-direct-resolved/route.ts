import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 500 })
    }
    
    // Use the exact same URL format as your working test
    const url = `https://platinumrepairs.repairshopr.com/api/v1/tickets?status=Resolved&page=1&limit=100&api_key=${token}`
    
    console.log('🔍 Testing direct API call with exact URL from your test:')
    console.log('URL:', url)
    console.log('Token (first 10 chars):', token.substring(0, 10) + '...')
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'API error', 
        status: response.status, 
        details: errorText 
      }, { status: 500 })
    }
    
    const data = await response.json()
    console.log('API Response:')
    console.log('- Has tickets:', !!data.tickets)
    console.log('- Ticket count:', data.tickets?.length || 0)
    console.log('- Meta:', data.meta)
    
    if (data.tickets && data.tickets.length > 0) {
      console.log('Sample ticket:')
      console.log('- ID:', data.tickets[0].id)
      console.log('- Number:', data.tickets[0].number)
      console.log('- Status:', data.tickets[0].status)
      console.log('- Subject:', data.tickets[0].subject?.substring(0, 50) + '...')
    }
    
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


