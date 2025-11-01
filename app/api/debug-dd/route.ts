import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.REPAIRSHOPR_TOKEN_DD
    const baseUrl = 'https://devicedoctorsa.repairshopr.com/api/v1'
    
    if (!token) {
      return NextResponse.json({ error: 'DD token not found' }, { status: 500 })
    }
    
    console.log('🔍 Testing Device Doctor API directly...')
    console.log('Token:', token.substring(0, 20) + '...')
    console.log('URL:', baseUrl)
    
    const url = `${baseUrl}/tickets?api_key=${token}`
    console.log('Fetching from:', url)
    
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
      console.error('Error response:', errorText)
      return NextResponse.json({ 
        error: 'DD API error', 
        status: response.status, 
        details: errorText 
      }, { status: 500 })
    }
    
    const data = await response.json()
    console.log('Response structure:', Object.keys(data))
    console.log('Total tickets:', data.tickets ? data.tickets.length : 'No tickets property')
    
    if (data.tickets && data.tickets.length > 0) {
      console.log('Sample ticket:', data.tickets[0])
      
      // Check statuses
      const statuses = data.tickets.map((t: any) => t.status)
      const uniqueStatuses = [...new Set(statuses)]
      console.log('All statuses:', uniqueStatuses)
      
      // Filter for allowed statuses (6 statuses including Awaiting Authorization)
      const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'Awaiting Authorization', 'In Progress']
      const filteredTickets = data.tickets.filter((ticket: any) => allowedStatuses.includes(ticket.status))
      console.log('Filtered tickets count:', filteredTickets.length)
      console.log('Filtered statuses:', [...new Set(filteredTickets.map((t: any) => t.status))])
      
      return NextResponse.json({
        success: true,
        totalTickets: data.tickets.length,
        filteredTickets: filteredTickets.length,
        allStatuses: uniqueStatuses,
        filteredStatuses: [...new Set(filteredTickets.map((t: any) => t.status))],
        sampleTicket: data.tickets[0],
        filteredSample: filteredTickets[0] || null
      })
    }
    
    return NextResponse.json({
      success: true,
      totalTickets: 0,
      message: 'No tickets found'
    })
    
  } catch (error) {
    console.error('DD API test error:', error)
    return NextResponse.json({ 
      error: 'DD API test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
