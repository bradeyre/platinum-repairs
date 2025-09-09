import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { deviceInfo, description } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert repair technician analyzing a device repair ticket. Your task is to:

1. Extract device information (make, model, IMEI if present)
2. Analyze the device information and description
3. Identify specific issues mentioned by the client
4. Create dynamic checkboxes for issues that need to be verified by the technician
5. Provide assessment and recommendations

Return a JSON object with this structure:
{
  "analysis": {
    "deviceInfo": "Brief device assessment",
    "repairability": "Repairable/Not Repairable/Needs Assessment",
    "recommendedActions": ["action1", "action2", "action3"],
    "riskFactors": ["risk1", "risk2", "risk3"]
  },
  "deviceDetails": {
    "make": "Extracted device manufacturer (e.g., Apple, Samsung, Huawei)",
    "model": "Extracted device model (e.g., iPhone 13 Pro, Galaxy S22 Ultra)",
    "imei": "Extracted IMEI number if present in the text"
  },
  "checkboxes": [
    {
      "id": "unique_id",
      "label": "Issue description for technician to check",
      "checked": false,
      "notes": ""
    }
  ]
}

Focus on:
- Extracting accurate make and model from device information
- Looking for IMEI numbers (15-digit numbers starting with 35, 86, or other valid prefixes)
- Creating checkboxes for specific issues mentioned in the description that need verification.`
        },
        {
          role: 'user',
          content: `Device: ${deviceInfo}\nDescription: ${description}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0].message.content
    if (content) {
      const parsed = JSON.parse(content)
      return NextResponse.json(parsed)
    }

    return NextResponse.json({ 
      error: 'Failed to parse AI response' 
    }, { status: 500 })

  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({ 
      error: 'AI analysis failed' 
    }, { status: 500 })
  }
}
