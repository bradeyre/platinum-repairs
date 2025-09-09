import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')
    const instance = searchParams.get('instance') // 'platinum' or 'devicedoctor'
    
    if (!ticketId || !instance) {
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

    console.log(`🔍 Fetching ticket details for ${ticketId} from ${instance} instance`)

    // Fetch ticket details
    const ticketUrl = `${baseUrl}/tickets/${ticketId}?api_key=${token}`
    console.log(`Ticket URL: ${ticketUrl}`)
    
    const ticketResponse = await fetch(ticketUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log(`Ticket response status: ${ticketResponse.status}`)

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text()
      console.error(`❌ Ticket API error: ${ticketResponse.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Failed to fetch ticket: ${ticketResponse.status}` },
        { status: ticketResponse.status }
      )
    }

    const ticketData = await ticketResponse.json()
    console.log(`✅ Got ticket data:`, JSON.stringify(ticketData, null, 2))

    // Fetch ticket comments
    const commentsUrl = `${baseUrl}/tickets/${ticketId}/comments?api_key=${token}`
    console.log(`Comments URL: ${commentsUrl}`)
    
    const commentsResponse = await fetch(commentsUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    console.log(`Comments response status: ${commentsResponse.status}`)

    let commentsData = null
    if (commentsResponse.ok) {
      commentsData = await commentsResponse.json()
      console.log(`✅ Got comments data:`, JSON.stringify(commentsData, null, 2))
    } else {
      const errorText = await commentsResponse.text()
      console.log(`❌ Comments API error: ${commentsResponse.status} - ${errorText}`)
    }

    // Extract claim number from ticket data and comments
    let claimNumber = ''
    let customFields: Array<{id: number, name: string, value: string}> = []

    // Check ticket data for custom fields
    const ticket = ticketData.ticket || ticketData
    if (ticket.custom_fields) {
      customFields = ticket.custom_fields
      console.log(`🎯 Custom fields in ticket data:`, customFields)
      
      // Look for claim number in custom fields
      const claimField = customFields.find((field: {id: number, name: string, value: string}) => 
        field.name && (
          field.name.toLowerCase().includes('claim') ||
          field.name.toLowerCase().includes('case') ||
          field.name.toLowerCase().includes('reference')
        )
      )
      
      if (claimField && claimField.value) {
        claimNumber = claimField.value
        console.log(`✅ Found claim number in custom fields: ${claimNumber}`)
      }
    }

    // If no claim number found in custom fields, check comments
    if (!claimNumber && commentsData && commentsData.comments) {
      console.log(`🔍 Searching for claim number in comments...`)
      
      for (const comment of commentsData.comments) {
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
      comments: commentsData,
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
