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

1. Analyze the device information and description
2. Identify specific issues mentioned by the client
3. Create dynamic checkboxes for issues that need to be verified by the technician
4. Provide assessment and recommendations

Return a JSON object with this structure:
{
  "analysis": {
    "deviceInfo": "Brief device assessment",
    "repairability": "Repairable/Not Repairable/Needs Assessment",
    "recommendedActions": ["action1", "action2", "action3"],
    "riskFactors": ["risk1", "risk2", "risk3"]
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

Focus on creating checkboxes for specific issues mentioned in the description that need verification.`
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
