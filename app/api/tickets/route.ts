import { NextResponse } from 'next/server'
import { getAllTickets } from '@/lib/repairshopr-new'

export async function GET() {
  try {
    console.log('API route called - fetching tickets...')
    console.log('Environment check:')
    console.log('REPAIRSHOPR_TOKEN:', process.env.REPAIRSHOPR_TOKEN ? 'Present' : 'Missing')
    console.log('REPAIRSHOPR_TOKEN_DD:', process.env.REPAIRSHOPR_TOKEN_DD ? 'Present' : 'Missing')
    
    // Test direct API call for Resolved tickets
    const token = process.env.REPAIRSHOPR_TOKEN
    if (token) {
      const testUrl = `https://platinumrepairs.repairshopr.com/api/v1/tickets?status=Resolved&page=1&limit=10&api_key=${token}`
      console.log('🔍 Testing direct Resolved API call:', testUrl)
      
      try {
        const response = await fetch(testUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })
        
        console.log('Direct API response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Direct API response:')
          console.log('- Ticket count:', data.tickets?.length || 0)
          console.log('- Meta:', data.meta)
          if (data.tickets && data.tickets.length > 0) {
            console.log('Sample Resolved ticket:', {
              id: data.tickets[0].id,
              number: data.tickets[0].number,
              status: data.tickets[0].status,
              subject: data.tickets[0].subject?.substring(0, 50) + '...'
            })
          }
        } else {
          const errorText = await response.text()
          console.error('Direct API error:', response.status, errorText)
        }
      } catch (directError) {
        console.error('Direct API call failed:', directError)
      }
    }
    
    const tickets = await getAllTickets()
    console.log(`API returning ${tickets.length} tickets`)
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error in tickets API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' // Ensure fresh data on each request