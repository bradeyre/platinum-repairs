import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketNumber = searchParams.get('ticketId') // This is actually the ticket number, not ID
    const instance = searchParams.get('instance') // 'platinum' or 'devicedoctor'
    
    if (!ticketNumber || !instance) {
      return NextResponse.json(
        { error: 'Missing ticketId or instance parameter' },
        { status: 400 }
      )
    }

    // Determine which API to use based on instance
    const baseUrl = instance === 'platinum' 
      ? 'https://platinumrepairs.repairshopr.com/api/v1'
      : 'https://devicedoctorsa.repairshopr.com/api/v1'
    
    const token = instance === 'platinum'
      ? process.env.REPAIRSHOPR_TOKEN
      : process.env.REPAIRSHOPR_TOKEN_DD

    if (!token) {
      return NextResponse.json(
        { error: 'API token not configured' },
        { status: 500 }
      )
    }

    console.log(`🔍 Fetching ticket details for number ${ticketNumber} from ${instance} instance`)

    // First, search for the ticket by number to get the actual ticket ID
    const searchUrl = `${baseUrl}/tickets?api_key=${token}&number=${ticketNumber}`
    console.log(`Search URL: ${searchUrl}`)
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log(`Search response status: ${searchResponse.status}`)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error(`❌ Search API error: ${searchResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to search for ticket: ${searchResponse.status}` },
        { status: searchResponse.status }
      )
    }

    const searchData = await searchResponse.json()
    console.log(`✅ Got search data:`, JSON.stringify(searchData, null, 2))

    if (!searchData.tickets || searchData.tickets.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = searchData.tickets[0]
    console.log(`✅ Found ticket:`, JSON.stringify(ticket, null, 2))

    // Extract claim number from ticket properties
    let claimNumber = ''
    let customFields: Array<{id: number, name: string, value: string}> = []

    // Check ticket properties for claim number
    if (ticket.properties) {
      console.log(`🎯 Ticket properties:`, ticket.properties)
      
      // Look for claim number in properties
      if (ticket.properties['Claim #']) {
        claimNumber = ticket.properties['Claim #']
        console.log(`✅ Found claim number in properties: ${claimNumber}`)
      } else {
        // Try other property names
        const claimKeys = Object.keys(ticket.properties).filter(key => 
          key.toLowerCase().includes('claim') ||
          key.toLowerCase().includes('case') ||
          key.toLowerCase().includes('reference')
        )
        
        if (claimKeys.length > 0) {
          claimNumber = ticket.properties[claimKeys[0]]
          console.log(`✅ Found claim number in properties (${claimKeys[0]}): ${claimNumber}`)
        }
      }
    }

    // If no claim number found in properties, check comments
    if (!claimNumber && ticket.comments) {
      console.log(`🔍 Searching for claim number in comments...`)
      
      for (const comment of ticket.comments) {
        const commentText = comment.body || comment.comment || ''
        console.log(`Checking comment: ${commentText.substring(0, 100)}...`)
        
        // Look for claim number patterns in comments
        const claimPatterns = [
          /(?:Claim|Claim Number|Claim #)[:\s]*([A-Z0-9]+)/i,
          /CC(\d+)/i,
          /([A-Z]{2}\d{6,})/i,
          /([A-Z]\d{6,})/i,
          /(\d{9,})/g
        ]
        
        for (const pattern of claimPatterns) {
          const match = commentText.match(pattern)
          if (match) {
            claimNumber = match[1]
            console.log(`✅ Found claim number in comment: ${claimNumber}`)
            break
          }
        }
        
        if (claimNumber) break
      }
    }

    return NextResponse.json({
      ticket: ticket,
      comments: ticket.comments,
      claimNumber,
      customFields
    })

  } catch (error) {
    console.error('Error fetching ticket details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
