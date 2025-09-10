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
    let serialNumber = ''
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
      
      // Look for serial number in properties
      if (ticket.properties['IMEI #']) {
        serialNumber = ticket.properties['IMEI #']
        console.log(`✅ Found serial number in properties (IMEI #): ${serialNumber}`)
      } else {
        // Try other property names for serial number
        const serialKeys = Object.keys(ticket.properties).filter(key => 
          key.toLowerCase().includes('imei') ||
          key.toLowerCase().includes('serial') ||
          key.toLowerCase().includes('s/n') ||
          key.toLowerCase().includes('sn')
        )
        
        if (serialKeys.length > 0) {
          serialNumber = ticket.properties[serialKeys[0]]
          console.log(`✅ Found serial number in properties (${serialKeys[0]}): ${serialNumber}`)
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

    // If no serial number found in properties, check comments (prioritize oldest comments first)
    if (!serialNumber && ticket.comments) {
      console.log(`🔍 Searching for serial number in comments...`)
      
      // Sort comments by creation date (oldest first) to prioritize original ticket data
      const sortedComments = [...ticket.comments].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        console.log(`Sorting: ${a.created_at} (${dateA}) vs ${b.created_at} (${dateB})`)
        return dateA - dateB
      })
      
      console.log(`📅 Sorted comments by date (oldest first):`)
      sortedComments.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment.created_at} - ${(comment.body || comment.comment || '').substring(0, 50)}...`)
      })
      
      for (const comment of sortedComments) {
        const commentText = comment.body || comment.comment || ''
        console.log(`Checking comment for serial (${comment.created_at}): ${commentText.substring(0, 100)}...`)
        
        // Look for serial number patterns in comments (prioritize IMEI # format)
        const serialPatterns = [
          /IMEI\s*#:\s*([A-Z0-9]{10,})/i, // Prioritize IMEI # format - this should match first
          /(?:IMEI\s*#?|Serial|S\/N|SN)[:\s]*([A-Z0-9]{10,})/i,
          /Serial:\s*([A-Z0-9]{10,})/i,
          /([A-Z0-9]{10,})/g, // Generic pattern for alphanumeric codes
          /(?:Device|Model)[:\s]*[^,]*,\s*([A-Z0-9]{10,})/i // Pattern like "Device: Apple MacBook, CO2H4WCZQ6L4"
        ]
        
        // First, try to find IMEI # format specifically
        const imeiMatch = commentText.match(/IMEI\s*#:\s*([A-Z0-9]{10,})/i)
        if (imeiMatch) {
          serialNumber = imeiMatch[1]
          console.log(`✅ Found IMEI # serial number in comment (${comment.created_at}): ${serialNumber}`)
          break
        }
        
        for (const pattern of serialPatterns) {
          const match = commentText.match(pattern)
          if (match) {
            serialNumber = match[1]
            console.log(`✅ Found serial number in comment (${comment.created_at}): ${serialNumber}`)
            break
          }
        }
        
        if (serialNumber) break
      }
    }

    // If still no serial number found, try AI extraction as fallback
    if (!serialNumber) {
      console.log('🤖 No serial number found with regex, trying AI extraction...')
      try {
        const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/extract-serial-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketData: {
              subject: ticket.subject,
              properties: ticket.properties,
              comments: ticket.comments?.map((c: any) => ({
                body: c.body,
                created_at: c.created_at
              }))
            }
          })
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          if (aiData.serialNumber) {
            serialNumber = aiData.serialNumber
            console.log(`✅ AI extracted serial number: ${serialNumber}`)
          }
        }
      } catch (aiError) {
        console.error('❌ AI serial extraction failed:', aiError)
      }
    }

    // Extract client name from ticket
    const clientName = ticket.customer?.name || ticket.customer_name || ticket.customer?.first_name + ' ' + ticket.customer?.last_name || ''

    return NextResponse.json({
      ticket: ticket,
      comments: ticket.comments,
      claimNumber,
      serialNumber,
      clientName,
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
