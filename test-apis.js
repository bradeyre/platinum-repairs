// Test script to check both RepairShopr APIs manually
require('dotenv').config()

async function testAPI(token, baseUrl, name) {
  try {
    console.log(`\n🔍 Testing ${name} API...`)
    console.log(`URL: ${baseUrl}/tickets`)
    console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`)
    
    const response = await fetch(`${baseUrl}/tickets`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log(`Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ ${name} API error: ${response.status} - ${errorText}`)
      return []
    }
    
    const data = await response.json()
    console.log(`✅ ${name} API success!`)
    console.log(`Response structure:`, Object.keys(data))
    console.log(`Tickets count:`, data.tickets ? data.tickets.length : 'No tickets property')
    
    if (data.tickets && data.tickets.length > 0) {
      console.log(`Sample ticket:`, {
        id: data.tickets[0].id,
        number: data.tickets[0].number,
        status: data.tickets[0].status,
        subject: data.tickets[0].subject
      })
      
      // Show all unique statuses
      const statuses = [...new Set(data.tickets.map(t => t.status))]
      console.log(`All statuses in ${name}:`, statuses)
      
      // Check for our 5 allowed statuses
      const allowedStatuses = ['Awaiting Rework', 'Awaiting Workshop Repairs', 'Awaiting Damage Report', 'Awaiting Repair', 'In Progress']
      const matchingStatuses = statuses.filter(s => allowedStatuses.includes(s))
      console.log(`Matching allowed statuses:`, matchingStatuses)
      
      // Count tickets with allowed statuses
      const allowedTickets = data.tickets.filter(t => allowedStatuses.includes(t.status))
      console.log(`Tickets with allowed statuses: ${allowedTickets.length}/${data.tickets.length}`)
    }
    
    return data.tickets || []
  } catch (error) {
    console.error(`❌ ${name} API error:`, error.message)
    return []
  }
}

async function main() {
  console.log('🚀 Testing both RepairShopr APIs...')
  
  const prToken = process.env.REPAIRSHOPR_TOKEN
  const ddToken = process.env.REPAIRSHOPR_TOKEN_DD
  
  console.log('\n🔍 Environment check:')
  console.log('REPAIRSHOPR_TOKEN:', prToken ? 'Present' : 'Missing')
  console.log('REPAIRSHOPR_TOKEN_DD:', ddToken ? 'Present' : 'Missing')
  
  if (!prToken || !ddToken) {
    console.error('❌ Missing API tokens!')
    return
  }
  
  const prTickets = await testAPI(prToken, 'https://platinumrepairs.repairshopr.com', 'Platinum Repairs')
  const ddTickets = await testAPI(ddToken, 'https://devic_doctorsa.repairshopr.com', 'Device Doctor')
  
  console.log('\n📊 Summary:')
  console.log(`Platinum Repairs tickets: ${prTickets.length}`)
  console.log(`Device Doctor tickets: ${ddTickets.length}`)
  console.log(`Total tickets: ${prTickets.length + ddTickets.length}`)
}

main().catch(console.error)
