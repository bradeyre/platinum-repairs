import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { ticketData } = await request.json()

    if (!ticketData) {
      return NextResponse.json(
        { error: 'Missing ticketData parameter' },
        { status: 400 }
      )
    }

    console.log('🤖 Using AI to extract serial number from ticket data')

    const prompt = `
You are an expert at extracting device serial numbers from repair ticket data. 

Analyze the following ticket information and extract the device serial number (IMEI, Serial Number, or similar identifier).

TICKET DATA:
${JSON.stringify(ticketData, null, 2)}

IMPORTANT RULES:
1. Look for serial numbers, IMEI numbers, or device identifiers
2. Common formats: CO2H4WCZQ6L4, 356742918119097, etc.
3. Prioritize the ORIGINAL ticket data over later comments
4. Look in ticket properties, subject, description, and comments
5. Serial numbers are typically 10+ characters long and contain letters/numbers
6. Return ONLY the serial number, nothing else

Return the serial number in this exact format:
{"serialNumber": "EXTRACTED_SERIAL_NUMBER"}

If no serial number is found, return:
{"serialNumber": ""}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting device serial numbers from repair ticket data. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 100
    })

    const response = completion.choices[0]?.message?.content?.trim()
    console.log('🤖 AI Response:', response)

    if (!response) {
      return NextResponse.json(
        { error: 'AI extraction failed' },
        { status: 500 }
      )
    }

    try {
      const parsed = JSON.parse(response)
      console.log('✅ AI extracted serial number:', parsed.serialNumber)
      
      return NextResponse.json({
        serialNumber: parsed.serialNumber || '',
        source: 'ai'
      })
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError)
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in AI serial extraction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
