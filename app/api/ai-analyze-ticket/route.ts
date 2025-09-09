import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { deviceInfo, description } = await request.json()
    
    console.log('🤖 AI Analysis API called with:', {
      deviceInfo,
      description: description?.substring(0, 200) + '...'
    })

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
2. Extract claim number if present (look for patterns like CC375514, C101096097, Claim: ABC123, etc.)
3. Analyze the device information and description
4. Identify specific issues mentioned by the client
5. Create dynamic checkboxes for issues that need to be verified by the technician
6. Provide assessment and recommendations

Return a JSON object with this EXACT structure:
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
    "deviceType": "MUST be one of: Phone, Laptop, Tablet, Watch, Desktop",
    "imei": "Extracted IMEI number if present in the text",
    "claim": "Extracted claim number if present in the text"
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

IMPORTANT: The deviceType field is REQUIRED and must be included in every response.

Focus on:
- Extracting accurate make and model from device information
- Detecting device type: Phone (iPhone, Galaxy, etc.), Laptop (MacBook, ThinkPad, etc.), Tablet (iPad, etc.), Watch (Apple Watch, etc.), Desktop, etc.
- Looking for IMEI numbers (15-digit numbers, 14-digit numbers, or serial numbers)
- Looking for claim numbers (patterns like CC375514, C101096097, Claim: ABC123, Case: XYZ789, etc.)
- Creating checkboxes for specific issues mentioned in the description that need verification.

Device Type Detection Rules:
- If model contains "MacBook", "ThinkPad", "Inspiron", "Pavilion", "Vostro", "Latitude", "XPS", "Surface Laptop", "ZenBook", "VivoBook", "Aspire", "IdeaPad", "Yoga", "Swift", "Spin", "TravelMate", "Satellite", "ProBook", "EliteBook", "ZBook", "Envy", "Spectre", "Stream", "Chromebook", "Gaming Laptop", "Workstation" → Device Type: "Laptop"
- If model contains "iPhone", "Galaxy", "Pixel", "OnePlus", "Huawei", "Xiaomi", "Oppo", "Vivo", "Realme", "Motorola", "Nokia", "Sony", "LG", "HTC", "BlackBerry" → Device Type: "Phone"
- If model contains "iPad", "Surface Pro", "Surface Go", "Galaxy Tab", "Fire Tablet", "Kindle", "Nexus", "Pixel Tablet" → Device Type: "Tablet"
- If model contains "Apple Watch", "Galaxy Watch", "Fitbit", "Garmin", "Amazfit", "Huawei Watch" → Device Type: "Watch"
- If model contains "iMac", "Mac Pro", "Mac Studio", "OptiPlex", "Precision", "PowerEdge", "ThinkCentre", "ThinkStation" → Device Type: "Desktop"`
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
      console.log('🤖 AI Analysis result:', parsed)
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
