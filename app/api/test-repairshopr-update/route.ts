import { NextRequest, NextResponse } from 'next/server'

// Function to update RepairShopr ticket status
async function updateRepairShoprTicketStatus(ticketNumber: string, ticketType: 'PR' | 'DD', newStatus: string) {
  try {
    const token = ticketType === 'PR' 
      ? process.env.REPAIRSHOPR_TOKEN 
      : process.env.REPAIRSHOPR_TOKEN_DD
    
    const baseUrl = ticketType === 'PR'
      ? 'https://platinumrepairs.repairshopr.com/api/v1'
      : 'https://devicedoctorsa.repairshopr.com/api/v1'
    
    if (!token) {
      console.error('RepairShopr token not found for ticket type:', ticketType)
      return { success: false, error: 'Token not found' }
    }

    console.log(`🔍 Testing RepairShopr update for ticket ${ticketNumber} in ${ticketType} instance`)
    console.log(`Token exists: ${!!token}`)
    console.log(`Base URL: ${baseUrl}`)

    // First, find the ticket by number to get its ID
    const searchUrl = `${baseUrl}/tickets?number=${ticketNumber}&api_key=${token}`
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
      console.error(`❌ Failed to search for ticket ${ticketNumber}: ${searchResponse.status} - ${errorText}`)
      return { success: false, error: `Search failed: ${searchResponse.status} - ${errorText}` }
    }

    const searchData = await searchResponse.json()
    console.log(`Search data:`, JSON.stringify(searchData, null, 2))
    
    const tickets = searchData.tickets || []
    
    if (tickets.length === 0) {
      console.error(`❌ Ticket ${ticketNumber} not found in ${ticketType} instance`)
      return { success: false, error: 'Ticket not found' }
    }

    const ticket = tickets[0]
    console.log(`✅ Found ticket ${ticketNumber} with ID ${ticket.id}`)

    // Update the ticket status
    const updateUrl = `${baseUrl}/tickets/${ticket.id}?api_key=${token}`
    console.log(`Update URL: ${updateUrl}`)
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus
      })
    })

    console.log(`Update response status: ${updateResponse.status}`)

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error(`❌ Failed to update ticket ${ticketNumber}: ${updateResponse.status} - ${errorText}`)
      return { success: false, error: `Update failed: ${updateResponse.status} - ${errorText}` }
    }

    const updateData = await updateResponse.json()
    console.log(`✅ Successfully updated ticket ${ticketNumber} status to ${newStatus}`)
    console.log(`Update response:`, JSON.stringify(updateData, null, 2))
    
    return { success: true, data: updateData }
  } catch (error) {
    console.error(`❌ Error updating RepairShopr ticket ${ticketNumber}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketNumber = searchParams.get('ticketNumber')
    const ticketType = searchParams.get('ticketType') as 'PR' | 'DD'
    const newStatus = searchParams.get('newStatus') || 'Damage Report Completed'

    if (!ticketNumber || !ticketType) {
      return NextResponse.json(
        { error: 'Missing ticketNumber or ticketType parameter' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing RepairShopr update for ticket ${ticketNumber} (${ticketType}) to status: ${newStatus}`)

    const result = await updateRepairShoprTicketStatus(ticketNumber, ticketType, newStatus)

    return NextResponse.json({
      ticketNumber,
      ticketType,
      newStatus,
      result
    })

  } catch (error) {
    console.error('Error testing RepairShopr update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
